import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };
const selectColumns = "id, reference_code, status, requested_at, confirmed_at, scheduled_for, completed_at, cancelled_at";
const internalSelectColumns = `${selectColumns}, audit_metadata`;
const deletionSchema = z.object({ confirmation: z.literal("DELETE MY ACCOUNT"), reauth_method: z.enum(["password", "email_otp"]) });
const reauthSchema = z.object({ method: z.enum(["password", "email_otp"]) });
const reauthLifetimeMs = 5 * 60 * 1000;
const gracePeriodMs = 14 * 24 * 60 * 60 * 1000;

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

function signedInDuringGracePeriod(user: { last_sign_in_at?: string }, row: { requested_at: string; scheduled_for: string | null }) {
  if (!user.last_sign_in_at) return false;
  const signedInAt = Date.parse(user.last_sign_in_at);
  const requestedAt = Date.parse(row.requested_at);
  const scheduledFor = row.scheduled_for ? Date.parse(row.scheduled_for) : requestedAt + gracePeriodMs;
  return signedInAt > requestedAt && signedInAt < scheduledFor;
}

async function cancelAfterSignIn(userId: string, row: { id: string; requested_at: string; scheduled_for: string | null; audit_metadata?: unknown }) {
  const admin = createAdminClient();
  if (!admin) return { data: null, error: new Error("Deletion service is not configured") };
  const existingAudit = row.audit_metadata && typeof row.audit_metadata === "object" && !Array.isArray(row.audit_metadata) ? row.audit_metadata as Record<string, unknown> : {};
  const { data, error } = await admin.from("account_deletion_requests").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    processing_started_at: null,
    last_error: null,
    audit_metadata: { ...existingAudit, cancelled_reason: "signed_in_during_grace_period", cancelled_at: new Date().toISOString() },
  }).eq("id", row.id).eq("user_id", userId).in("status", ["requested", "pending_review"]).select(selectColumns).maybeSingle();
  return { data, error };
}

async function getRequestsAndCancelOnSignIn(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, user: NonNullable<Awaited<ReturnType<typeof currentUser>>["user"]>) {
  const { data, error } = await supabase.from("account_deletion_requests").select(internalSelectColumns).eq("user_id", user.id).order("requested_at", { ascending: false }).limit(10);
  if (error) return { data: null, error };
  const rows = data ?? [];
  const active = rows.find((row) => row.status === "requested" || row.status === "pending_review");
  if (active && signedInDuringGracePeriod(user, active) && active.scheduled_for && Date.parse(active.scheduled_for) > Date.now()) {
    const cancelled = await cancelAfterSignIn(user.id, active);
    if (cancelled.error) return { data: null, error: cancelled.error };
    const replaced = rows.map((row) => row.id === active.id ? cancelled.data : row).filter(Boolean);
    return { data: replaced, error: null };
  }
  return { data: rows, error: null };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const { data, error } = await getRequestsAndCancelOnSignIn(supabase, user);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  const requests = (data ?? []).map((row) => { const publicRow = { ...row }; delete (publicRow as { audit_metadata?: unknown }).audit_metadata; return publicRow; });
  return NextResponse.json({ requests }, { headers: noStoreHeaders });
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
  const { data: existing } = await supabase.from("account_deletion_requests").select(selectColumns).eq("user_id", user.id).in("status", ["requested", "pending_review", "processing"]).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ request: existing, alreadyRequested: true }, { status: 200, headers: noStoreHeaders });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Deletion service is not configured" }, { status: 503, headers: noStoreHeaders });
  const requestedAt = new Date();
  const scheduledFor = new Date(requestedAt.getTime() + gracePeriodMs).toISOString();
  const { data, error } = await admin.from("account_deletion_requests").insert({ user_id: user.id, status: "requested", requested_at: requestedAt.toISOString(), confirmed_at: requestedAt.toISOString(), scheduled_for: scheduledFor, grace_period_days: 14, audit_metadata: { source: "support", confirmation: "explicit_phrase", reauthentication: parsed.data.reauth_method, grace_period_days: 14 } }).select(selectColumns).single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An active deletion request already exists." }, { status: 409, headers: noStoreHeaders });
    return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  }
  return NextResponse.json({ request: data, alreadyRequested: false }, { status: 201, headers: noStoreHeaders });
}

export async function DELETE() {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Deletion service is not configured" }, { status: 503, headers: noStoreHeaders });
  const { data, error } = await admin.from("account_deletion_requests").update({ status: "cancelled", cancelled_at: new Date().toISOString(), processing_started_at: null, last_error: null, audit_metadata: { cancellation_source: "user", cancelled_at: new Date().toISOString() } }).eq("user_id", user.id).in("status", ["requested", "pending_review"]).select(selectColumns).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  if (!data) return NextResponse.json({ error: "There is no active deletion request to cancel." }, { status: 404, headers: noStoreHeaders });
  return NextResponse.json({ request: data, cancelled: true }, { headers: noStoreHeaders });
}
