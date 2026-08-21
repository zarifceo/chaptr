import { NextResponse } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { POLICY_VERSIONS } from "@/lib/policy-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function redirectWithNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  Object.entries(noStoreHeaders).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

function shouldRecordSignupConsent(user: User | null, signupHandoff: boolean) {
  if (!signupHandoff || !user) return false;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  if (metadata?.policy_consent === true) {
    return metadata.terms_version === POLICY_VERSIONS.terms && metadata.privacy_version === POLICY_VERSIONS.privacy;
  }
  return true;
}

async function recordSignupConsent(supabase: Awaited<ReturnType<typeof createClient>>, user: User | null, signupHandoff: boolean) {
  if (!supabase || !user || !shouldRecordSignupConsent(user, signupHandoff)) return;
  const { data: existingProfile } = await supabase.from("user_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (existingProfile) return;
  await supabase.rpc("accept_current_policy_versions", {
    p_terms_version: POLICY_VERSIONS.terms,
    p_privacy_version: POLICY_VERSIONS.privacy,
    p_source: "signup",
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const signupHandoff = requestUrl.searchParams.get("policy_signup") === "1" || requestedNext.includes("policy_signup=1");
  const supabase = await createClient();
  if (!supabase) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));

  if (tokenHash) {
    const requestedType = requestUrl.searchParams.get("type");
    const allowedTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
    if (!requestedType || !allowedTypes.includes(requestedType as EmailOtpType)) {
      return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
    }
    const { data: verification, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: requestedType as EmailOtpType });
    if (error) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
    if (requestedType === "signup") await recordSignupConsent(supabase, verification.user, signupHandoff);
    if (next === "/auth/reset-password") return redirectWithNoStore(new URL("/auth/reset-password", requestUrl.origin));
    const verifiedUrl = new URL("/auth", requestUrl.origin);
    verifiedUrl.searchParams.set("verified", "1");
    return redirectWithNoStore(verifiedUrl);
  }

  if (!code) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
  const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !exchange.session) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
  await recordSignupConsent(supabase, exchange.session.user, signupHandoff);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const trustedHost = forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) ? forwardedHost : requestUrl.host;
  const origin = `${forwardedProto === "http" ? "http" : "https"}://${trustedHost}`;
  return redirectWithNoStore(new URL(next, origin));
}
