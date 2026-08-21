import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };
const selectColumns = "id, reference_code, status, requested_at, confirmed_at, scheduled_for, completed_at, cancelled_at";
const deletionSchema = z.object({ confirmation: z.literal("DELETE MY ACCOUNT") });

async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null };
  const { data: claims } = await supabase.auth.getClaims();
  return { supabase, userId: claims?.claims?.sub ?? null };
}

export async function GET() {
  const { supabase, userId } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const { data, error } = await supabase.from("account_deletion_requests").select(selectColumns).eq("user_id", userId).order("requested_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  return NextResponse.json({ requests: data ?? [] }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const { supabase, userId } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = deletionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE MY ACCOUNT to confirm the request." }, { status: 400, headers: noStoreHeaders });
  const { data: existing } = await supabase.from("account_deletion_requests").select(selectColumns).eq("user_id", userId).in("status", ["requested", "pending_review"]).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ request: existing, alreadyRequested: true }, { status: 200, headers: noStoreHeaders });
  const { data, error } = await supabase.from("account_deletion_requests").insert({ user_id: userId, status: "requested", confirmed_at: new Date().toISOString(), audit_metadata: { source: "support", confirmation: "explicit_phrase" } }).select(selectColumns).single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An active deletion request already exists." }, { status: 409, headers: noStoreHeaders });
    return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  }
  return NextResponse.json({ request: data, alreadyRequested: false }, { status: 201, headers: noStoreHeaders });
}
