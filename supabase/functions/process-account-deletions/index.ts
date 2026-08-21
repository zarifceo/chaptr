import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type DeletionRow = {
  id: string;
  user_id: string;
  status: "requested" | "pending_review" | "processing";
  requested_at: string;
  scheduled_for: string | null;
  processing_started_at: string | null;
  audit_metadata: Record<string, unknown>;
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "https://jjqmeuizldwymbvqynfw.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "study-resources";
const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS = 30 * 60 * 1000;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function isWithinGracePeriod(row: DeletionRow, signInAt: string | null) {
  if (!signInAt) return false;
  const signedInAt = Date.parse(signInAt);
  const requestedAt = Date.parse(row.requested_at);
  const scheduledFor = row.scheduled_for ? Date.parse(row.scheduled_for) : requestedAt + GRACE_PERIOD_MS;
  return signedInAt > requestedAt && signedInAt < scheduledFor;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function listStoragePaths(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const itemPath = `${prefix}/${item.name}`;
      if (item.id === null) paths.push(...await listStoragePaths(admin, itemPath));
      else paths.push(itemPath);
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return paths;
}

async function removeStoragePaths(admin: SupabaseClient, userId: string) {
  const paths = await listStoragePaths(admin, userId);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
  return paths.length;
}

async function cancelForSignIn(admin: SupabaseClient, row: DeletionRow) {
  const { error } = await admin.from("account_deletion_requests").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    processing_started_at: null,
    last_error: null,
    audit_metadata: { ...row.audit_metadata, cancelled_reason: "signed_in_during_grace_period", cancelled_at: new Date().toISOString() },
  }).eq("id", row.id).in("status", ["requested", "pending_review"]);
  if (error) throw error;
}

async function failRow(admin: SupabaseClient, row: DeletionRow, error: unknown) {
  const message = errorMessage(error).slice(0, 1000);
  await admin.from("account_deletion_requests").update({
    status: "pending_review",
    processing_started_at: null,
    last_failure_at: new Date().toISOString(),
    last_error: message,
    audit_metadata: { ...row.audit_metadata, last_failure_reason: message, last_failure_at: new Date().toISOString() },
  }).eq("id", row.id).eq("status", "processing");
  return message;
}

async function processRow(admin: SupabaseClient, row: DeletionRow) {
  const now = Date.now();
  const scheduledFor = row.scheduled_for ? Date.parse(row.scheduled_for) : Date.parse(row.requested_at) + GRACE_PERIOD_MS;
  if (!Number.isFinite(scheduledFor) || scheduledFor > now) return { kind: "not_due" as const };
  if (row.status === "processing" && row.processing_started_at && Date.parse(row.processing_started_at) > now - STALE_PROCESSING_MS) return { kind: "locked" as const };

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(row.user_id);
  if (userError && !/not found/i.test(userError.message)) throw userError;
  if (!userResult?.user) return { kind: "missing_user" as const };

  if (isWithinGracePeriod(row, userResult.user.last_sign_in_at)) {
    await cancelForSignIn(admin, row);
    return { kind: "cancelled" as const };
  }

  const processingAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.from("account_deletion_requests").update({ status: "processing", processing_started_at: processingAt }).eq("id", row.id).eq("status", row.status).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { kind: "locked" as const };

  try {
    const removedFiles = await removeStoragePaths(admin, row.user_id);
    const { error: deleteError } = await admin.auth.admin.deleteUser(row.user_id);
    if (deleteError && !/not found/i.test(deleteError.message)) throw deleteError;
    return { kind: "deleted" as const, removedFiles };
  } catch (error) {
    const message = await failRow(admin, row, error);
    return { kind: "failed" as const, error: message };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  if (!SERVICE_ROLE_KEY) return json({ error: "Supabase function secrets are not configured" }, 503);

  const cronToken = request.headers.get("x-cron-token");
  if (!cronToken) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: tokenValid, error: tokenError } = await admin.rpc("verify_account_deletion_cron_token", { candidate: cronToken });
  if (tokenError || tokenValid !== true) return json({ error: "Unauthorized" }, 401);
  const { data: rows, error } = await admin.from("account_deletion_requests").select("id, user_id, status, requested_at, scheduled_for, processing_started_at, audit_metadata").in("status", ["requested", "pending_review", "processing"]).order("scheduled_for", { ascending: true }).limit(100);
  if (error) return json({ error: error.message }, 500);

  const summary = { scanned: rows?.length ?? 0, deleted: 0, cancelled: 0, failed: 0, skipped: 0, filesRemoved: 0 };
  for (const row of (rows ?? []) as DeletionRow[]) {
    try {
      const result = await processRow(admin, row);
      if (result.kind === "deleted") { summary.deleted += 1; summary.filesRemoved += result.removedFiles; }
      else if (result.kind === "cancelled") summary.cancelled += 1;
      else if (result.kind === "failed") summary.failed += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.failed += 1;
      await failRow(admin, row, error);
    }
  }

  return json(summary);
});
