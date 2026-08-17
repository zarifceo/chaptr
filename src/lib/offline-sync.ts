"use client";

type CloudRow = Record<string, unknown>;

export async function queueCloudSync(table: string, rows: CloudRow[]) {
  const response = await fetch("/api/sync/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ table, rows }),
  });
  const body = await response.json().catch(() => null) as { error?: string; synced?: number } | null;
  if (!response.ok) throw new Error(body?.error ?? "Database write failed");
  window.dispatchEvent(new CustomEvent("ssc-database-write", { detail: { table, synced: body?.synced ?? rows.length } }));
  return body;
}

export async function flushCloudSync() {
  return { synced: 0, pending: 0 };
}

export async function getPendingSyncCount() {
  return 0;
}

export function installOnlineSync() {
  return () => undefined;
}
