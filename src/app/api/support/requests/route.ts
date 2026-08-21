import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };
const categories = ["getting-started", "tasks-study-flow", "syllabus-goals", "calendar", "resources", "account-privacy", "planning-recommendations"] as const;
const diagnosticKeys = ["route", "viewport", "browser", "appVersion", "timestamp"] as const;
const requestSchema = z.object({
  category: z.enum(categories),
  page_context: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().min(10, "Tell us what happened in at least 10 characters.").max(4000),
  expected_behavior: z.string().trim().max(2000).optional().nullable(),
  include_diagnostics: z.boolean().default(false),
  diagnostics: z.record(z.string(), z.string().trim().max(240)).optional(),
});

async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null };
  const { data: claims } = await supabase.auth.getClaims();
  return { supabase, userId: claims?.claims?.sub ?? null };
}

function cleanDiagnostics(input: Record<string, string> | undefined, include: boolean) {
  if (!include || !input) return null;
  return Object.fromEntries(diagnosticKeys.flatMap((key) => input[key] ? [[key, input[key]]] : []));
}

const selectColumns = "id, reference_code, category, page_context, description, expected_behavior, diagnostic_details, status, created_at, updated_at";

export async function GET() {
  const { supabase, userId } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  const { data, error } = await supabase.from("support_requests").select(selectColumns).eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  return NextResponse.json({ requests: data ?? [] }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const { supabase, userId } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStoreHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid support request" }, { status: 400, headers: noStoreHeaders });
  const values = parsed.data;
  const { data, error } = await supabase.from("support_requests").insert({
    user_id: userId,
    category: values.category,
    page_context: values.page_context || null,
    description: values.description,
    expected_behavior: values.expected_behavior || null,
    diagnostic_details: cleanDiagnostics(values.diagnostics, values.include_diagnostics),
  }).select(selectColumns).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
  return NextResponse.json({ request: data }, { status: 201, headers: noStoreHeaders });
}
