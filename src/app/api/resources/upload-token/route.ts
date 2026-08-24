import { NextResponse } from "next/server";
import { z } from "zod";
import { policyRequiredResponse } from "@/lib/policy-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "study-resources";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_USER_BYTES = 500 * 1024 * 1024;
const MAX_USER_FILES = 100;
const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/octet-stream",
]);
const payload = z.object({
  fileName: z.string().trim().min(1).max(180),
  fileSize: z.number().int().min(1).max(MAX_FILE_BYTES),
  mimeType: z.string().trim().min(1).max(180),
});
const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0", Expires: "0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503, headers: noStoreHeaders });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in again before uploading a resource." }, { status: 401, headers: noStoreHeaders });
  const consentResponse = await policyRequiredResponse(supabase, userId, "/resources");
  if (consentResponse) return consentResponse;

  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid file no larger than 25 MB." }, { status: 400, headers: noStoreHeaders });
  const mimeType = parsed.data.mimeType || "application/octet-stream";
  if (!allowedMimeTypes.has(mimeType)) return NextResponse.json({ error: "This file type is not supported." }, { status: 415, headers: noStoreHeaders });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure uploads are not configured for this deployment." }, { status: 503, headers: noStoreHeaders });
  const { data: existing, error: listError } = await admin.storage.from(BUCKET).list(userId, { limit: MAX_USER_FILES, offset: 0 });
  if (listError) {
    console.error("[api/resources/upload-token] storage list failed", { userId, message: listError.message });
    return NextResponse.json({ error: "Could not check your upload allowance. Try again." }, { status: 502, headers: noStoreHeaders });
  }
  const usedBytes = (existing ?? []).reduce((total, item) => total + Number((item.metadata as { size?: number } | null)?.size ?? 0), 0);
  if ((existing ?? []).length >= MAX_USER_FILES) return NextResponse.json({ error: "You have reached the 100-file resource limit." }, { status: 413, headers: noStoreHeaders });
  if (usedBytes + parsed.data.fileSize > MAX_USER_BYTES) return NextResponse.json({ error: "This upload would exceed your 500 MB resource allowance." }, { status: 413, headers: noStoreHeaders });

  const safeName = parsed.data.fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data?.token) {
    console.error("[api/resources/upload-token] signed URL failed", { userId, message: error?.message });
    return NextResponse.json({ error: "Could not prepare the upload. Try again." }, { status: 502, headers: noStoreHeaders });
  }
  return NextResponse.json({ storagePath, token: data.token }, { headers: noStoreHeaders });
}
