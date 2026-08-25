import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/policy-config";
import { productionSiteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = process.env.NODE_ENV === "production" ? productionSiteOrigin : requestUrl.origin;
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const isDeletionReauthentication = requestUrl.searchParams.get("reauth") === "deletion";
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  if (!supabase) {
    console.error("[google-auth] Supabase is not configured");
    return NextResponse.redirect(new URL("/auth?error=callback", origin));
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "openid email profile",
      queryParams: isDeletionReauthentication ? { prompt: "select_account" } : undefined,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.warn("[google-auth] OAuth initialization failed", {
      errorCode: error?.code ?? "missing_provider_url",
    });
    return NextResponse.redirect(new URL("/auth?error=callback", origin));
  }

  console.info("[google-auth] OAuth initialized", { hostname: new URL(origin).hostname });
  return NextResponse.redirect(data.url);
}
