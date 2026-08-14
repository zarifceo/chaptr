import { NextResponse } from "next/server";
import { googleOAuth } from "@/lib/google-calendar";
import { encryptToken } from "@/lib/token-crypto";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const supabase = await createClient();
  const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
  const expected = (await cookies()).get("calendar_oauth_state")?.value;
  if (!data.user || !code || !state || state !== expected) return NextResponse.redirect(new URL("/?calendar=denied", request.url));
  try {
    const auth = googleOAuth();
    const { tokens } = await auth.getToken(code);
    const { data: previous } = await supabase!.from("sync_state").select("encrypted_refresh_token").eq("user_id", data.user.id).maybeSingle();
    await supabase!.from("sync_state").upsert({
      user_id: data.user.id,
      encrypted_access_token: tokens.access_token ? encryptToken(tokens.access_token) : null,
      encrypted_refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : previous?.encrypted_refresh_token ?? null,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      calendar_sync_token: null,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.redirect(new URL("/?calendar=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?calendar=failed", request.url));
  }
}
