import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAcademicData } from "@/lib/seed-academics";

const referenceTables = ["subjects", "chapters", "marks_distributions", "workflow_steps", "exams"] as const;
const userTables = ["study_tasks", "chapter_progress", "chapter_preferences", "journal_entries", "mistakes", "mock_results", "study_sessions", "study_resources", "exam_events", "planning_settings", "adaptive_plan_summaries", "user_profiles"] as const;

const defaultPlanning = { main_start: "15:00", main_end: "19:00", math_start: "20:00", math_end: "22:00", daily_target: 240, math_days_per_week: 6, agriculture_days_per_week: 4, reminders_enabled: false };

export async function GET() {
  await ensureAcademicData();
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const referenceResults = await Promise.all(referenceTables.map(async (table) => {
    const { data, error } = await supabase.from(table).select("*");
    return [table, error ? [] : data ?? []] as const;
  }));
  const reference = Object.fromEntries(referenceResults) as Record<string, Record<string, unknown>[]>;
  const chapters = (reference.chapters ?? []) as Array<{ id: string }>;
  const exams = (reference.exams ?? []) as Array<{ id: string; name: string; starts_on: string; ends_on: string }>;

  const [{ data: existingPreferences }, { data: existingEvents }, { data: existingPlanning }] = await Promise.all([
    supabase.from("chapter_preferences").select("chapter_id").eq("user_id", userId),
    supabase.from("exam_events").select("id").eq("user_id", userId).eq("archived", false),
    supabase.from("planning_settings").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  const existingChapterIds = new Set((existingPreferences ?? []).map((row) => row.chapter_id));
  const missingPreferences = chapters.filter((chapter) => !existingChapterIds.has(chapter.id)).map((chapter) => ({ user_id: userId, chapter_id: chapter.id, included_for_ssc: true, excluded: false, priority: 3 }));
  if (missingPreferences.length) await supabase.from("chapter_preferences").upsert(missingPreferences);

  if (!(existingEvents ?? []).length && exams.length) {
    await supabase.from("exam_events").upsert(exams.map((exam) => ({ user_id: userId, id: exam.id, name: exam.name, starts_on: exam.starts_on, ends_on: exam.ends_on, kind: exam.id === "ssc" ? "official" : "mock", scope: exam.id === "ssc" ? ["All SSC 2027 syllabus", "Board exam conditions"] : ["Full syllabus diagnostic", "Written + MCQ practice"], locked: true, archived: false })));
  }
  if (!existingPlanning) await supabase.from("planning_settings").upsert({ user_id: userId, ...defaultPlanning });

  const { data: existingProfile } = await supabase.from("user_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!existingProfile) await supabase.from("user_profiles").upsert({ user_id: userId, selected_subjects: [], onboarding_step: 0, onboarding_completed: false });

  const userResults = await Promise.all(userTables.map(async (table) => {
    const query = supabase.from(table).select("*");
    const { data, error } = table === "planning_settings" || table === "adaptive_plan_summaries" || table === "user_profiles" ? await query.eq("user_id", userId).maybeSingle() : await query.eq("user_id", userId).order("updated_at", { ascending: false });
    return [table, error ? [] : data == null ? [] : Array.isArray(data) ? data : [data]] as const;
  }));
  return NextResponse.json({ mode: "cloud", data: { ...reference, ...Object.fromEntries(userResults) } });
}
