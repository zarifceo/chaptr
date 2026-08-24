import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasCurrentPolicyConsent, POLICY_CONSENT_STATUS, POLICY_ROUTES, POLICY_VERSIONS, safeNextPath } from "@/lib/policy-config";

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function isConsentExemptPath(pathname: string) {
  return pathname === POLICY_ROUTES.terms
    || pathname === POLICY_ROUTES.privacy
    || pathname === POLICY_ROUTES.consent
    || pathname === "/auth"
    || pathname.startsWith("/auth/")
    || pathname === "/support"
    || pathname.startsWith("/api/auth/")
    || pathname.startsWith("/api/support/")
    || pathname === "/api/onboarding"
    || pathname === "/api/policies/accept";
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  Object.entries(noStoreHeaders).forEach(([name, value]) => response.headers.set(name, value));

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId || isConsentExemptPath(request.nextUrl.pathname)) return response;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("terms_version, privacy_version, terms_accepted_at, privacy_accepted_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !hasCurrentPolicyConsent(profile)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return copyResponseCookies(response, NextResponse.json({
        error: "Current Terms of Service and Privacy Policy acceptance is required.",
        code: "POLICY_CONSENT_REQUIRED",
        consentPath: `${POLICY_ROUTES.consent}?next=${encodeURIComponent("/home")}`,
        currentVersions: POLICY_VERSIONS,
      }, { status: POLICY_CONSENT_STATUS }));
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = POLICY_ROUTES.consent;
    redirectUrl.search = "";
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", safeNextPath(requestedPath));
    return copyResponseCookies(response, NextResponse.redirect(redirectUrl));
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
