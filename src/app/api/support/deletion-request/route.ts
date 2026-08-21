import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };
const selectColumns = "id, reference_code, status, requested_at, confirmed_at, scheduled_for, completed_at, cancelled_at";
const deletionSchema = z.object({ confirmation: z.literal("DELETE MY ACCOUNT"), reauth_method: z.enum(["password", "email_otp"]) });
const reauthSchema = z.object({ method: z.enum(["password", "email_otp"]) });
const reauthLifetimeMs = 5 * 60 * 1000;

async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

function hasFreshReauthentication(user: { last_sign_in_at?: string }) {
  const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  return Boolean(lastSignInAt && Date.now() - lastSignInAt <= reauthLifetimeMs);
}

function isGoogleUser(user: { app_metadata?: { provider?: string }; identities?: Array<{ provider?: string }> | null }) {
  return user.app_metadata?.provider === "google" || Boolean(user.identities?.some((identity) => identity.provider === "google"));
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const { data, error } = await supabase.from("account_deletion_requests").select(selectColumns).eq("user_id", user.id).order("requested_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  return NextResponse.json({ requests: data ?? [] }, { headers: noStoreHeaders });
}

export async function PUT(request: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = reauthSchema.safeParse(body);
  if (!parsed.success || (parsed.data.method === "password" && isGoogleUser(user)) || !hasFreshReauthentication(user)) return NextResponse.json({ error: isGoogleUser(user) ? "Google accounts must use email-code verification." : "Verify your password or email code again before continuing.", reauthenticationRequired: true }, { status: 403, headers: noStoreHeaders });
  return NextResponse.json({ verified: true, method: parsed.data.method }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = deletionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE MY ACCOUNT to confirm the request and verify your identity first." }, { status: 400, headers: noStoreHeaders });
  if (parsed.data.reauth_method === "password" && isGoogleUser(user)) return NextResponse.json({ error: "Google accounts must use email-code verification.", reauthenticationRequired: true }, { status: 403, headers: noStoreHeaders });
  if (!hasFreshReauthentication(user)) return NextResponse.json({ error: "Verify your password or email code again before submitting the deletion request.", reauthenticationRequired: true }, { status: 403, headers: noStoreHeaders });
  const { data: existing } = await supabase.from("account_deletion_requests").select(selectColumns).eq("user_id", user.id).in("status", ["requested", "pending_review"]).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ request: existing, alreadyRequested: true }, { status: 200, headers: noStoreHeaders });
  const { data, error } = await supabase.from("account_deletion_requests").insert({ user_id: user.id, status: "requested", confirmed_at: new Date().toISOString(), audit_metadata: { source: "support", confirmation: "explicit_phrase", reauthentication: parsed.data.reauth_method } }).select(selectColumns).single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An active deletion request already exists." }, { status: 409, headers: noStoreHeaders });
    return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  }
  return NextResponse.json({ request: data, alreadyRequested: false }, { status: 201, headers: noStoreHeaders });
}
