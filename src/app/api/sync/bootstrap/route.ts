import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAcademicData } from "@/lib/seed-academics";
import { recommendedWorkflows, studyPhases } from "@/lib/study-workflows";
import { commonSubjectIds, groupSubjectIds } from "@/lib/academic-profile";
import { policyRequiredResponse } from "@/lib/policy-server";

const referenceTables = ["subjects", "chapters", "marks_distributions", "workflow_steps", "exams", "curated_textbooks"] as const;
const userTables = ["study_tasks", "chapter_progress", "chapter_preferences", "journal_entries", "mistakes", "mock_results", "study_sessions", "exam_sessions", "study_resources", "exam_events", "exam_plan_phases", "planning_settings", "adaptive_plan_summaries", "user_profiles", "learning_preferences", "subject_assessments", "recommendation_feedback", "study_workflows", "study_workflow_presets"] as const;

const defaultPlanning = { study_windows: [{ id: "window-1", start: "09:00", end: "12:00" }], daily_target: 240, reminders_enabled: false };
const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };
const defaultWorkflows = studyPhases.map(({ id }) => ({ phase: id, steps: recommendedWorkflows[id] }));

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const consentResponse = await policyRequiredResponse(supabase, userId, "/home");
  if (consentResponse) return consentResponse;
  await ensureAcademicData();

  const { data: loadedProfile, error: profileReadError } = await supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (profileReadError) {
    console.error("[api/sync/bootstrap] profile read failed", { code: profileReadError.code, message: profileReadError.message });
    return NextResponse.json({ error: "Could not load your profile. Refresh and try again." }, { status: 500, headers: noStoreHeaders });
  }
  let profile = loadedProfile;
  if (!profile) {
    const { data: createdProfile, error: profileCreateError } = await supabase.from("user_profiles").insert({ user_id: userId, selected_subjects: [], onboarding_step: 0, onboarding_completed: false, academic_profile_completed: false, book_language: "bn", academic_year: 2026 }).select("*").single();
    if (profileCreateError) {
      console.error("[api/sync/bootstrap] profile creation failed", { code: profileCreateError.code, message: profileCreateError.message });
      return NextResponse.json({ error: "Could not prepare your profile. Refresh and try again." }, { status: 500, headers: noStoreHeaders });
    }
    profile = createdProfile;
  }
  const hasAcademicProfile = Boolean(profile?.academic_profile_completed && profile.study_group && profile.religion_subject_id && profile.fourth_subject_id);
  const activeSubjectIds = new Set<string>(commonSubjectIds);
  if (hasAcademicProfile) {
    groupSubjectIds[profile.study_group as keyof typeof groupSubjectIds]?.forEach((id) => activeSubjectIds.add(id));
    activeSubjectIds.add(String(profile.religion_subject_id));
    activeSubjectIds.add(String(profile.fourth_subject_id));
  }

  const referenceResults = await Promise.all(referenceTables.map(async (table) => {
    const { data, error } = await supabase.from(table).select("*");
    return [table, error ? [] : data ?? []] as const;
  }));
  const reference = Object.fromEntries(referenceResults) as Record<string, Record<string, unknown>[]>;
  const catalogSubjects = reference.subjects ?? [];
  const catalogChapters = reference.chapters ?? [];
  const catalogMarks = reference.marks_distributions ?? [];
  const catalogTextbooks = (reference.curated_textbooks ?? []).filter((row) => String(row.language ?? "bn") === "bn");

  // A new student needs the complete reference catalog while choosing a group,
  // religion, and fourth subject. Once the profile is complete, send only that
  // student's subjects so the rest of the app remains scoped to their course.
  reference.subjects = hasAcademicProfile ? catalogSubjects.filter((row) => activeSubjectIds.has(String(row.id))) : catalogSubjects;
  reference.chapters = hasAcademicProfile ? catalogChapters.filter((row) => activeSubjectIds.has(String(row.subject_id))) : catalogChapters;
  reference.marks_distributions = hasAcademicProfile ? catalogMarks.filter((row) => activeSubjectIds.has(String(row.subject_id))) : catalogMarks;
  reference.curated_textbooks = hasAcademicProfile ? catalogTextbooks.filter((row) => activeSubjectIds.has(String(row.subject_id))) : catalogTextbooks;

  // User-owned defaults should still be created only for the subjects currently
  // selected (common subjects until the academic profile is complete).
  const chapters = catalogChapters.filter((row) => activeSubjectIds.has(String(row.subject_id))) as Array<{ id: string }>;
  const exams = (reference.exams ?? []) as Array<{ id: string; name: string; starts_on: string; ends_on: string }>;
  const referenceSubjects = catalogSubjects.filter((row) => activeSubjectIds.has(String(row.id))) as Array<{ id: string }>;

  const [{ data: existingPreferences }, { data: existingEvents }, { data: existingPlanning }, { data: existingLearningPreferences }, { data: existingAssessments }, { data: existingWorkflows }] = await Promise.all([
    supabase.from("chapter_preferences").select("chapter_id").eq("user_id", userId),
    supabase.from("exam_events").select("id").eq("user_id", userId).eq("archived", false),
    supabase.from("planning_settings").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("learning_preferences").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("subject_assessments").select("subject_id").eq("user_id", userId),
    supabase.from("study_workflows").select("phase").eq("user_id", userId),
  ]);

  const existingChapterIds = new Set((existingPreferences ?? []).map((row) => row.chapter_id));
  const missingPreferences = chapters.filter((chapter) => !existingChapterIds.has(chapter.id)).map((chapter) => ({ user_id: userId, chapter_id: chapter.id, included_for_ssc: true, excluded: false, priority: 3 }));
  if (missingPreferences.length) await supabase.from("chapter_preferences").upsert(missingPreferences);

  if (!(existingEvents ?? []).length && exams.length) {
    await supabase.from("exam_events").upsert(exams.map((exam) => ({ user_id: userId, id: exam.id, name: exam.name, starts_on: exam.starts_on, ends_on: exam.ends_on, kind: exam.id === "ssc" ? "official" : "mock", scope: exam.id === "ssc" ? ["All SSC 2027 syllabus", "Board exam conditions"] : ["Full syllabus diagnostic", "Written + MCQ practice"], locked: true, archived: false })));
  }
  if (!existingPlanning) await supabase.from("planning_settings").upsert({ user_id: userId, ...defaultPlanning });
  if (!existingLearningPreferences) await supabase.from("learning_preferences").upsert({ user_id: userId });
  if (!(existingAssessments ?? []).length && referenceSubjects.length) await supabase.from("subject_assessments").upsert(referenceSubjects.map((subject) => ({ user_id: userId, subject_id: subject.id, starting_point: "uncertain", difficulty: 3, confidence: 3, priority: 3, preferred_methods: [] })));
  const existingWorkflowPhases = new Set((existingWorkflows ?? []).map((row) => row.phase));
  const missingWorkflows = defaultWorkflows.filter((workflow) => !existingWorkflowPhases.has(workflow.phase)).map((workflow) => ({ user_id: userId, ...workflow }));
  if (missingWorkflows.length) await supabase.from("study_workflows").upsert(missingWorkflows);

  const userResults = await Promise.all(userTables.map(async (table) => {
    const query = supabase.from(table).select("*");
    const { data, error } = table === "planning_settings" || table === "adaptive_plan_summaries" || table === "user_profiles" || table === "learning_preferences" ? await query.eq("user_id", userId).maybeSingle() : table === "recommendation_feedback" ? await query.eq("user_id", userId).order("created_at", { ascending: false }) : await query.eq("user_id", userId).order("updated_at", { ascending: false });
    return [table, error ? [] : data == null ? [] : Array.isArray(data) ? data : [data]] as const;
  }));
  return NextResponse.json({ mode: "cloud", data: { ...reference, ...Object.fromEntries(userResults) } }, { headers: noStoreHeaders });
}
