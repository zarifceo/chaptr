import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const POLICY_VERSION = "2026-08-17";

const profilePatch = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  accept_policies: z.literal(true).optional(),
  board: z.string().trim().min(1).max(40).optional(),
  exam_year: z.number().int().min(2025).max(2035).optional(),
  selected_subjects: z.array(z.string().min(1).max(80)).max(30).optional(),
  daily_target: z.number().int().min(15).max(600).optional(),
  main_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  main_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  onboarding_step: z.number().int().min(0).max(7).optional(),
  onboarding_completed: z.boolean().optional(),
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
  if (existing) return NextResponse.json({ profile: existing });

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ profile: created });
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

  const { accept_policies: acceptPolicies, ...profileData } = parsed.data;
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
  return NextResponse.json({ profile: data });
}
