import { NextResponse } from "next/server";

export async function POST() {
  // Google notifications intentionally carry no event data. The app performs an
  // authenticated incremental sync on app-open/manual sync, avoiding trust in a
  // spoofable unauthenticated notification body.
  return NextResponse.json({ accepted: true }, { status: 202 });
}
