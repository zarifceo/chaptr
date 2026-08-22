import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/policy-config";

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();
  if (!supabase) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));

  if (tokenHash) {
    const requestedType = requestUrl.searchParams.get("type");
    const allowedTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
    if (!requestedType || !allowedTypes.includes(requestedType as EmailOtpType)) {
      return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
    }
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: requestedType as EmailOtpType });
    if (error) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
    if (next === "/auth/reset-password") return redirectWithNoStore(new URL("/auth/reset-password", requestUrl.origin));
    const verifiedUrl = new URL("/auth", requestUrl.origin);
    verifiedUrl.searchParams.set("verified", "1");
    return redirectWithNoStore(verifiedUrl);
  }

  if (!code) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
  const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !exchange.session) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));
  return redirectWithNoStore(new URL(next, requestUrl.origin));
}
