import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { POLICY_ROUTES, POLICY_VERSIONS } from "@/lib/policy-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const acceptanceSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  source: z.enum(["signup", "reacceptance"]).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = acceptanceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Read and accept both the Terms of Service and Privacy Policy before continuing." }, { status: 400 });

  const { data: profile } = await supabase.from("user_profiles").select("terms_version, privacy_version, terms_accepted_at, privacy_accepted_at").eq("user_id", userId).maybeSingle();
  const source = parsed.data.source ?? (profile ? "reacceptance" : "signup");
  const { data, error } = await supabase.rpc("accept_current_policy_versions", {
    p_terms_version: POLICY_VERSIONS.terms,
    p_privacy_version: POLICY_VERSIONS.privacy,
    p_source: source,
  });
  if (error) return NextResponse.json({ error: "Could not save your policy acceptance. Please try again." }, { status: 400 });

  return NextResponse.json({
    accepted: true,
    log: data,
    next: POLICY_ROUTES.consent,
    versions: POLICY_VERSIONS,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
