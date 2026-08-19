import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const POLICY_VERSION = "2026-08-17";
const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };

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
  steps: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
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
  accept_policies: z.literal(true).optional(),
  board: z.string().trim().min(1).max(40).optional(),
  exam_year: z.number().int().min(2025).max(2035).optional(),
  selected_subjects: z.array(z.string().min(1).max(80)).max(30).optional(),
  daily_target: z.number().int().min(15).max(600).optional(),
  main_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  main_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  onboarding_step: z.number().int().min(0).max(9).optional(),
  onboarding_completed: z.boolean().optional(),
  learning_preferences: learningPreferencesPatch.optional(),
  subject_assessments: z.array(subjectAssessment).max(30).optional(),
  study_workflows: z.array(studyWorkflow).max(4).optional(),
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
  if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });
  if (existing)   return NextResponse.json({ profile: existing }, { headers: noStoreHeaders });

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ profile: created }, { headers: noStoreHeaders });
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

  const { accept_policies: acceptPolicies, learning_preferences: learningPreferences, subject_assessments: subjectAssessments, study_workflows: studyWorkflows, exam_plan_phases: examPlanPhases, ...profileData } = parsed.data;
  const consent = acceptPolicies ? {
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    terms_version: POLICY_VERSION,
    privacy_version: POLICY_VERSION,
  } : {};
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, ...profileData, ...consent, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (learningPreferences) {
    const { error: preferencesError } = await supabase.from("learning_preferences").upsert({ user_id: userId, ...learningPreferences, updated_at: new Date().toISOString() });
    if (preferencesError) return NextResponse.json({ error: preferencesError.message }, { status: 400 });
  }
  if (subjectAssessments) {
    const { error: assessmentError } = await supabase.from("subject_assessments").upsert(subjectAssessments.map((assessment) => ({ user_id: userId, ...assessment, updated_at: new Date().toISOString() })), { onConflict: "user_id,subject_id" });
    if (assessmentError) return NextResponse.json({ error: assessmentError.message }, { status: 400 });
  }
  if (studyWorkflows) {
    const { error: workflowError } = await supabase.from("study_workflows").upsert(studyWorkflows.map((workflow) => ({ user_id: userId, phase: workflow.phase, steps: workflow.steps, updated_at: new Date().toISOString() })), { onConflict: "user_id,phase" });
    if (workflowError) return NextResponse.json({ error: workflowError.message }, { status: 400 });
  }
  if (examPlanPhases) {
    const { error: deletePlanError } = await supabase.from("exam_plan_phases").delete().eq("user_id", userId);
    if (deletePlanError) return NextResponse.json({ error: deletePlanError.message }, { status: 400 });
    const { error: planError } = await supabase.from("exam_plan_phases").insert(examPlanPhases.map((phase) => ({ user_id: userId, ...phase, updated_at: new Date().toISOString() })));
    if (planError) return NextResponse.json({ error: planError.message }, { status: 400 });
  }
  const [{ data: savedPreferences }, { data: savedAssessments }, { data: savedWorkflows }, { data: savedExamPlan }] = await Promise.all([
    supabase.from("learning_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("subject_assessments").select("*").eq("user_id", userId).order("subject_id"),
    supabase.from("study_workflows").select("*").eq("user_id", userId).order("phase"),
    supabase.from("exam_plan_phases").select("*").eq("user_id", userId).order("phase_order"),
  ]);
  return NextResponse.json({ profile: data, learning_preferences: savedPreferences, subject_assessments: savedAssessments ?? [], study_workflows: savedWorkflows ?? [], exam_plan_phases: savedExamPlan ?? [] }, { headers: noStoreHeaders });
}
