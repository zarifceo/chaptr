"use client";

import { openDB } from "idb";

type SyncItem = { id: string; table: string; rows: Record<string, unknown>[] };

const database = () => openDB("ssc-command-center", 1, {
  upgrade(db) { if (!db.objectStoreNames.contains("sync-queue")) db.createObjectStore("sync-queue", { keyPath: "id" }); },
});

export async function queueCloudSync(table: string, rows: Record<string, unknown>[]) {
  const db = await database();
  for (const row of rows) {
    const rowId = typeof row.id === "string" ? row.id : crypto.randomUUID();
    const item: SyncItem = { id: `${table}:${rowId}`, table, rows: [row] };
    await db.put("sync-queue", item);
  }
  window.dispatchEvent(new Event("ssc-sync-queue-change"));
  await flushCloudSync();
}

export async function flushCloudSync(): Promise<{ synced: number; pending: number }> {
  if (!navigator.onLine) return { synced: 0, pending: await getPendingSyncCount() };
  const db = await database();
  const items = await db.getAll("sync-queue") as SyncItem[];
  let synced = 0;
  for (const item of items) {
    const response = await fetch("/api/sync/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: item.table, rows: item.rows }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { synced?: number } | null : null;
    if (response?.ok && result?.synced) {
      await db.delete("sync-queue", item.id);
      synced += result.synced;
    }
  }
  const pending = await getPendingSyncCount();
  window.dispatchEvent(new Event("ssc-sync-queue-change"));
  return { synced, pending };
}

export async function getPendingSyncCount() {
  const db = await database();
  return db.count("sync-queue");
}

export function installOnlineSync() {
  const run = () => void flushCloudSync();
  window.addEventListener("online", run);
  run();
  return () => window.removeEventListener("online", run);
}
