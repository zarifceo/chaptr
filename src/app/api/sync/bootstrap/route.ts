import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAcademicData } from "@/lib/seed-academics";

const tables = ["study_tasks", "chapter_progress", "chapter_preferences", "journal_entries", "mistakes", "mock_results", "study_sessions", "study_resources"] as const;

export async function GET() {
  await ensureAcademicData();
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ mode: "local", data: {} });
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ mode: "local", data: {} });
  const results = await Promise.all(tables.map(async table => {
    const { data, error } = await supabase.from(table).select("*").order("updated_at", { ascending: false });
    return [table, error ? [] : data ?? []] as const;
  }));
  return NextResponse.json({ mode: "cloud", data: Object.fromEntries(results) });
}
