import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({ table: z.enum(["study_tasks", "chapter_progress", "journal_entries", "mistakes", "mock_results"]), rows: z.array(z.record(z.string(), z.unknown())).max(500) });

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ queued: true, mode: "local" }, { status: 202 });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = parsed.data.rows.map(row => ({ ...row, user_id: userId, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from(parsed.data.table).upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ synced: rows.length });
}
