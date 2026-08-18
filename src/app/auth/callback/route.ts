import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  if (!code) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));

  const supabase = await createClient();
  if (!supabase) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));

  const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !exchange.session) return redirectWithNoStore(new URL("/auth?error=callback", requestUrl.origin));

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const trustedHost = forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) ? forwardedHost : requestUrl.host;
  const origin = `${forwardedProto === "http" ? "http" : "https"}://${trustedHost}`;
  return redirectWithNoStore(new URL(next, origin));
}
