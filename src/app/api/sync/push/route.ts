import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const payload = z.object({ table: z.enum(["study_tasks", "chapter_progress", "chapter_preferences", "journal_entries", "mistakes", "mock_results"]), rows: z.array(z.record(z.string(), z.unknown())).max(500) });

type SyncTable = z.infer<typeof payload>["table"];
type InsertRow<T extends SyncTable> = Database["public"]["Tables"][T]["Insert"];

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ queued: true, mode: "local" }, { status: 202 });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
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
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ synced: rows.length });
}
