import { NextResponse } from "next/server";
import { calendarScopes, googleOAuth } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!data.user) return NextResponse.redirect(new URL("/settings?calendar=signin-required", request.url));
  try {
    const state = Buffer.from(JSON.stringify({ userId: data.user.id, nonce: crypto.randomUUID() })).toString("base64url");
    const response = NextResponse.redirect(googleOAuth().generateAuthUrl({ access_type: "offline", prompt: "consent", include_granted_scopes: true, scope: calendarScopes, state }));
    response.cookies.set("calendar_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/settings?calendar=config-required", request.url));
  }
}
