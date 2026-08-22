import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SSC_EXAM_YEAR = 2027;
const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };

type DatabaseError = { code?: string; message: string; details?: string; hint?: string };

function onboardingDatabaseError(operation: string, error: DatabaseError, message: string) {
  console.error(`[api/onboarding] ${operation} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
  return NextResponse.json({ error: message }, { status: 500, headers: noStoreHeaders });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const learningPreferencesPatch = z.object({
  preferred_methods: z.array(z.string().min(1).max(40)).max(12).optional(),
  preferred_resource_kinds: z.array(z.string().min(1).max(40)).max(12).optional(),
  session_length_minutes: z.number().int().min(15).max(180).optional(),
  sessions_per_day: z.number().int().min(1).max(8).optional(),
  available_days: z.array(z.string().min(2).max(3)).max(7).optional(),
  weekday_minutes: z.number().int().min(30).max(600).optional(),
  weekend_minutes: z.number().int().min(30).max(720).optional(),
  target_grade: z.string().trim().min(1).max(12).optional(),
  guidance_mode: z.enum(["guided", "balanced", "quiet"]).optional(),
  plan_strictness: z.enum(["flexible", "balanced", "strict"]).optional(),
  instruction_ratio: z.number().int().min(0).max(100).optional(),
  practice_ratio: z.number().int().min(0).max(100).optional(),
  review_ratio: z.number().int().min(0).max(100).optional(),
}).partial();

const studyWorkflow = z.object({
  phase: z.enum(["learn", "revise", "practice", "exam"]),
  steps: z.array(z.string().trim().min(1).max(180)).min(1).max(8),
});

const workflowPreset = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  phase: z.enum(["learn", "revise", "practice", "exam"]),
  subject_type: z.enum(["theory", "mathematical", "custom"]),
  steps: z.array(z.string().trim().min(1).max(180)).min(1).max(8),
});

const examPlanPhase = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  objective: z.string().trim().max(300),
  phase_order: z.number().int().min(0).max(30),
}).refine((phase) => phase.ends_on >= phase.starts_on, { message: "Exam plan phases must end on or after their start date" });

const subjectAssessment = z.object({
  subject_id: z.string().min(1).max(80),
  difficulty: z.number().int().min(1).max(5).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  starting_point: z.enum(["comfortable", "mixed", "difficult", "uncertain"]).optional(),
  preferred_methods: z.array(z.string().min(1).max(40)).max(12).optional(),
});

const profilePatch = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  board: z.string().trim().min(1).max(40).optional(),
  exam_year: z.literal(SSC_EXAM_YEAR).optional(),
  selected_subjects: z.array(z.string().min(1).max(80)).max(30).optional(),
  subject_strengths: z.record(z.string().min(1).max(80), z.enum(["strongest", "very-strong", "moderate", "toughest"])).optional(),
  most_difficult_subject_id: z.string().min(1).max(80).nullable().optional(),
  study_group: z.enum(["science", "commerce", "humanities"]).nullable().optional(),
  religion_subject_id: z.enum(["islam", "hinduism"]).nullable().optional(),
  fourth_subject_id: z.enum(["higher-mathematics", "agriculture", "home-science"]).nullable().optional(),
  academic_year: z.number().int().min(2025).max(2035).optional(),
  book_language: z.literal("bn").optional(),
  academic_profile_completed: z.boolean().optional(),
  daily_target: z.number().int().min(15).max(600).optional(),
  onboarding_step: z.number().int().min(0).max(10).optional(),
  onboarding_completed: z.boolean().optional(),
  quick_start_status: z.enum(["active", "dismissed", "completed"]).optional(),
  learning_preferences: learningPreferencesPatch.optional(),
  subject_assessments: z.array(subjectAssessment).max(30).optional(),
  study_workflows: z.array(studyWorkflow).max(4).optional(),
  study_workflow_presets: z.array(workflowPreset).max(30).optional(),
  exam_plan_phases: z.array(examPlanPhase).max(30).optional(),
});

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null };
  const { data: claims } = await supabase.auth.getClaims();
  return { supabase, userId: claims?.claims?.sub ?? null };
}

export async function GET() {
  const { supabase, userId } = await currentUserId();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: existing, error: readError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return onboardingDatabaseError("read profile", readError, "Could not load your setup. Refresh and try again.");
  if (existing) return NextResponse.json({ profile: { ...existing, exam_year: SSC_EXAM_YEAR } }, { headers: noStoreHeaders });

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId, exam_year: SSC_EXAM_YEAR })
    .select("*")
    .single();
  if (createError) return onboardingDatabaseError("create profile", createError, "Could not start your setup. Please try again.");
  return NextResponse.json({ profile: { ...created, exam_year: SSC_EXAM_YEAR } }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const { supabase, userId } = await currentUserId();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = profilePatch.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid onboarding profile" }, { status: 400 });

  const { learning_preferences: learningPreferences, subject_assessments: subjectAssessments, study_workflows: studyWorkflows, study_workflow_presets: studyWorkflowPresets, exam_plan_phases: examPlanPhases, ...profileData } = parsed.data;
  const profileValues = { ...profileData, exam_year: SSC_EXAM_YEAR, updated_at: new Date().toISOString() };
  const { data: updatedProfile, error: updateError } = await supabase
    .from("user_profiles")
    .update(profileValues)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (updateError) return onboardingDatabaseError("update profile", updateError, "Could not save this setup step. Please try again.");

  let data = updatedProfile;
  if (!data) {
    const { data: createdProfile, error: insertError } = await supabase
      .from("user_profiles")
      .insert({ user_id: userId, ...profileValues })
      .select("*")
      .single();
    if (insertError) return onboardingDatabaseError("create profile during save", insertError, "Could not save this setup step. Please try again.");
    data = createdProfile;
  }

  if (learningPreferences) {
    const { error: preferencesError } = await supabase.from("learning_preferences").upsert({ user_id: userId, ...learningPreferences, updated_at: new Date().toISOString() });
    if (preferencesError) return onboardingDatabaseError("save learning preferences", preferencesError, "Could not save your learning preferences. Please try again.");
  }
  if (subjectAssessments) {
    const { error: assessmentError } = await supabase.from("subject_assessments").upsert(subjectAssessments.map((assessment) => ({ user_id: userId, ...assessment, updated_at: new Date().toISOString() })), { onConflict: "user_id,subject_id" });
    if (assessmentError) return onboardingDatabaseError("save subject assessments", assessmentError, "Could not save your subject ratings. Please try again.");
  }
  if (studyWorkflows) {
    const { error: workflowError } = await supabase.from("study_workflows").upsert(studyWorkflows.map((workflow) => ({ user_id: userId, phase: workflow.phase, steps: workflow.steps, updated_at: new Date().toISOString() })), { onConflict: "user_id,phase" });
    if (workflowError) return onboardingDatabaseError("save study workflows", workflowError, "Could not save your study workflow. Please try again.");
  }
  if (studyWorkflowPresets) {
    const { error: deletePresetsError } = await supabase.from("study_workflow_presets").delete().eq("user_id", userId);
    if (deletePresetsError) return onboardingDatabaseError("replace workflow presets", deletePresetsError, "Could not update your workflow presets. Please try again.");
    if (studyWorkflowPresets.length) {
      const { error: presetError } = await supabase.from("study_workflow_presets").insert(studyWorkflowPresets.map((preset) => ({ id: preset.id, user_id: userId, name: preset.name, description: preset.description, phase: preset.phase, subject_type: preset.subject_type, steps: preset.steps, updated_at: new Date().toISOString() })));
      if (presetError) return onboardingDatabaseError("save workflow presets", presetError, "Could not save your workflow presets. Please try again.");
    }
  }
  if (examPlanPhases) {
    const { error: deletePlanError } = await supabase.from("exam_plan_phases").delete().eq("user_id", userId);
    if (deletePlanError) return onboardingDatabaseError("replace exam plan", deletePlanError, "Could not update your exam plan. Please try again.");
    const { error: planError } = await supabase.from("exam_plan_phases").insert(examPlanPhases.map((phase) => ({ user_id: userId, ...phase, updated_at: new Date().toISOString() })));
    if (planError) return onboardingDatabaseError("save exam plan", planError, "Could not save your exam plan. Please try again.");
  }
  const [{ data: savedPreferences }, { data: savedAssessments }, { data: savedWorkflows }, { data: savedPresets }, { data: savedExamPlan }] = await Promise.all([
    supabase.from("learning_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("subject_assessments").select("*").eq("user_id", userId).order("subject_id"),
    supabase.from("study_workflows").select("*").eq("user_id", userId).order("phase"),
    supabase.from("study_workflow_presets").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("exam_plan_phases").select("*").eq("user_id", userId).order("phase_order"),
  ]);
  return NextResponse.json({ profile: { ...data, exam_year: SSC_EXAM_YEAR }, learning_preferences: savedPreferences, subject_assessments: savedAssessments ?? [], study_workflows: savedWorkflows ?? [], study_workflow_presets: savedPresets ?? [], exam_plan_phases: savedExamPlan ?? [] }, { headers: noStoreHeaders });
}
