import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { hasCurrentPolicyConsent, POLICY_CONSENT_STATUS, POLICY_ROUTES, POLICY_VERSIONS, safeNextPath } from "@/lib/policy-config";

export type AppSupabaseClient = SupabaseClient<Database>;

export async function getPolicyConsent(supabase: AppSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("terms_version, privacy_version, terms_accepted_at, privacy_accepted_at")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error, current: hasCurrentPolicyConsent(data) };
}

export async function policyRequiredResponse(supabase: AppSupabaseClient, userId: string, nextPath?: string) {
  const { data, error, current } = await getPolicyConsent(supabase, userId);
  if (error) return NextResponse.json({ error: "Policy acceptance status is unavailable." }, { status: 503 });
  if (current) return null;
  const next = safeNextPath(nextPath);
  return NextResponse.json({
    error: "Current Terms of Service and Privacy Policy acceptance is required.",
    code: "POLICY_CONSENT_REQUIRED",
    consentPath: `${POLICY_ROUTES.consent}?next=${encodeURIComponent(next)}`,
    currentVersions: POLICY_VERSIONS,
    acceptedVersions: {
      terms: data?.terms_version ?? null,
      privacy: data?.privacy_version ?? null,
    },
  }, { status: POLICY_CONSENT_STATUS });
}

