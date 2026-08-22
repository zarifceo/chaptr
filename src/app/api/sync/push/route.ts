import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { policyRequiredResponse } from "@/lib/policy-server";

const payload = z.object({ table: z.enum(["study_tasks", "chapter_progress", "chapter_preferences", "journal_entries", "mistakes", "mock_results", "study_sessions", "exam_sessions", "study_resources", "exam_events", "exam_plan_phases", "planning_settings", "adaptive_plan_summaries"]), rows: z.array(z.record(z.string(), z.unknown())).max(500) });
const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };

type SyncTable = z.infer<typeof payload>["table"];
type InsertRow<T extends SyncTable> = Database["public"]["Tables"][T]["Insert"];

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = payload.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ queued: true, mode: "local" }, { status: 202, headers: noStoreHeaders });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const consentResponse = await policyRequiredResponse(supabase, userId, "/home");
  if (consentResponse) return consentResponse;
  const rows = parsed.data.rows.map(row => ({ ...row, user_id: userId, updated_at: new Date().toISOString() }));
  let error: { message: string } | null;
  switch (parsed.data.table) {
    case "study_tasks":
      ({ error } = await supabase.from("study_tasks").upsert(rows as InsertRow<"study_tasks">[]));
      break;
    case "chapter_progress":
      ({ error } = await supabase.from("chapter_progress").upsert(rows as InsertRow<"chapter_progress">[]));
      break;
    case "chapter_preferences":
      ({ error } = await supabase.from("chapter_preferences").upsert(rows as InsertRow<"chapter_preferences">[]));
      break;
    case "journal_entries":
      ({ error } = await supabase.from("journal_entries").upsert(rows as InsertRow<"journal_entries">[]));
      break;
    case "mistakes":
      ({ error } = await supabase.from("mistakes").upsert(rows as InsertRow<"mistakes">[]));
      break;
    case "mock_results":
      ({ error } = await supabase.from("mock_results").upsert(rows as InsertRow<"mock_results">[]));
      break;
    case "study_sessions":
      ({ error } = await supabase.from("study_sessions").upsert(rows as InsertRow<"study_sessions">[]));
      break;
    case "exam_sessions":
      ({ error } = await supabase.from("exam_sessions").upsert(rows as InsertRow<"exam_sessions">[]));
      break;
    case "study_resources":
      ({ error } = await supabase.from("study_resources").upsert(rows as InsertRow<"study_resources">[]));
      break;
    case "exam_events":
      ({ error } = await supabase.from("exam_events").upsert(rows as InsertRow<"exam_events">[]));
      break;
    case "exam_plan_phases":
      ({ error } = await supabase.from("exam_plan_phases").upsert(rows as InsertRow<"exam_plan_phases">[]));
      break;
    case "planning_settings":
      ({ error } = await supabase.from("planning_settings").upsert(rows as InsertRow<"planning_settings">[]));
      break;
    case "adaptive_plan_summaries":
      ({ error } = await supabase.from("adaptive_plan_summaries").upsert(rows as InsertRow<"adaptive_plan_summaries">[]));
      break;
  }
  if (error) {
    const message = /deferred_until.*schema cache|column .* does not exist/i.test(error.message)
      ? "The study database is missing its latest migration. Please retry after the database schema is updated."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
  return NextResponse.json({ synced: rows.length }, { headers: noStoreHeaders });
}
