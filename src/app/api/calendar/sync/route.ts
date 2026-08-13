import { google, calendar_v3 } from "googleapis";
import { NextResponse } from "next/server";
import { authorizedGoogle, isOwnedEvent, ownedTask } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!auth.user || !supabase) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: state } = await supabase.from("sync_state").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (!state?.encrypted_refresh_token) return NextResponse.json({ error: "Calendar is not connected" }, { status: 409 });
  const calendar = google.calendar({ version: "v3", auth: authorizedGoogle(state) });
  let syncToken = state.calendar_sync_token as string | null;
  const listAll = async (token: string | null) => {
    let pageToken: string | undefined;
    let nextSyncToken: string | null = null;
    let events: calendar_v3.Schema$Event[] = [];
    do {
      const response = await calendar.events.list({ calendarId: "primary", showDeleted: true, singleEvents: true, syncToken: token ?? undefined, pageToken });
      events = events.concat(response.data.items ?? []);
      pageToken = response.data.nextPageToken ?? undefined;
      nextSyncToken = response.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    return { events, nextSyncToken };
  };
  let events: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | null = null;
  try {
    ({ events, nextSyncToken } = await listAll(syncToken));
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status !== 410 || !syncToken) return NextResponse.json({ error: "Calendar sync failed" }, { status: 502 });
    syncToken = null;
    await supabase.from("calendar_links").delete().eq("user_id", auth.user.id);
    ({ events, nextSyncToken } = await listAll(null));
  }
  for (const event of events.filter(isOwnedEvent)) {
    const taskId = event.extendedProperties?.private?.sscTaskId;
    if (!taskId) continue;
    if (event.status === "cancelled") {
      await supabase.from("study_tasks").update({ planned_start: null, planned_end: null, updated_at: new Date().toISOString() }).eq("user_id", auth.user.id).eq("id", taskId).neq("status", "completed");
      if (event.id) await supabase.from("calendar_links").delete().eq("user_id", auth.user.id).eq("event_id", event.id);
      continue;
    }
    await supabase.from("study_tasks").update({ planned_start: event.start?.dateTime ?? null, planned_end: event.end?.dateTime ?? null, updated_at: new Date().toISOString() }).eq("user_id", auth.user.id).eq("id", taskId).neq("status", "completed");
    await supabase.from("calendar_links").upsert({ user_id: auth.user.id, task_id: taskId, event_id: event.id!, event_etag: event.etag, calendar_id: "primary", last_calendar_update: event.updated, updated_at: new Date().toISOString() }, { onConflict: "user_id,event_id" });
  }
  const { data: tasks } = await supabase.from("study_tasks").select("*").eq("user_id", auth.user.id).in("status", ["planned", "in-progress"]).not("planned_start", "is", null);
  const { data: links } = await supabase.from("calendar_links").select("task_id,event_id").eq("user_id", auth.user.id);
  const linked = new Map((links ?? []).map((link) => [link.task_id, link.event_id]));
  for (const task of tasks ?? []) {
    const resource: calendar_v3.Schema$Event = { summary: `SSC · ${task.title}`, description: task.priority_explanation ?? undefined, start: { dateTime: task.planned_start, timeZone: "Asia/Dhaka" }, end: { dateTime: task.planned_end, timeZone: "Asia/Dhaka" }, extendedProperties: ownedTask(task.id), reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] } };
    const eventId = linked.get(task.id);
    const saved = eventId ? await calendar.events.patch({ calendarId: "primary", eventId, requestBody: resource }) : await calendar.events.insert({ calendarId: "primary", requestBody: resource });
    if (!eventId && saved.data.id) await supabase.from("calendar_links").insert({ user_id: auth.user.id, task_id: task.id, event_id: saved.data.id, event_etag: saved.data.etag, calendar_id: "primary", last_app_update: new Date().toISOString() });
  }
  await supabase.from("sync_state").update({ calendar_sync_token: nextSyncToken, last_successful_sync: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", auth.user.id);
  return NextResponse.json({ synced: events.filter(isOwnedEvent).length + (tasks?.length ?? 0), calendarEventsRead: events.filter(isOwnedEvent).length, tasksWritten: tasks?.length ?? 0 });
}
