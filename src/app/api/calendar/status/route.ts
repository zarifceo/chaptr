import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const required = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  const supabase = await createClient();

  if (!supabase) return NextResponse.json({ authenticated: false, configured: missing.length === 0, connected: false, missing });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ authenticated: false, configured: missing.length === 0, connected: false, missing });

  const [{ data: state }, { count }] = await Promise.all([
    supabase.from("sync_state").select("encrypted_refresh_token,last_successful_sync").eq("user_id", data.user.id).maybeSingle(),
    supabase.from("calendar_links").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
  ]);

  return NextResponse.json({
    authenticated: true,
    configured: missing.length === 0,
    connected: Boolean(state?.encrypted_refresh_token) && missing.length === 0,
    lastSuccessfulSync: state?.last_successful_sync ?? null,
    linkedEvents: count ?? 0,
    missing,
  });
}
