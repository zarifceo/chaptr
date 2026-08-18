import { google, calendar_v3 } from "googleapis";
import { NextResponse } from "next/server";
import { authorizedGoogle, isOwnedEvent, ownedTask } from "@/lib/google-calendar";
import { encryptToken } from "@/lib/token-crypto";
import { createClient } from "@/lib/supabase/server";

function googleStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: number; status?: number; response?: { status?: number } };
  return value.code ?? value.status ?? value.response?.status;
}

function isMissingGoogleEvent(error: unknown) {
  return [404, 410].includes(googleStatus(error) ?? -1);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!auth.user || !supabase) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: state } = await supabase.from("sync_state").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (!state?.encrypted_refresh_token) return NextResponse.json({ error: "Calendar is not connected" }, { status: 409 });
  const clearCalendarAuthorization = async () => {
    await supabase.from("sync_state").update({ encrypted_access_token: null, encrypted_refresh_token: null, token_expiry: null, calendar_sync_token: null, updated_at: new Date().toISOString() }).eq("user_id", auth.user.id);
  };
  const reconnectResponse = () => NextResponse.json({ error: "Google Calendar authorization expired. Reconnect Calendar to continue.", reconnectRequired: true }, { status: 401 });
  const refreshedTokens: { value: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null } | null } = { value: null };
  const calendar = google.calendar({ version: "v3", auth: authorizedGoogle(state, (tokens) => { refreshedTokens.value = { ...tokens }; }) });
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
    const status = googleStatus(error);
    if (status === 401 || status === 403) {
      await clearCalendarAuthorization();
      return reconnectResponse();
    }
    if (status !== 410 || !syncToken) return NextResponse.json({ error: "Calendar sync failed" }, { status: 502 });
    syncToken = null;
    await supabase.from("calendar_links").delete().eq("user_id", auth.user.id);
    try {
      ({ events, nextSyncToken } = await listAll(null));
    } catch (retryError) {
      const retryStatus = googleStatus(retryError);
      if (retryStatus === 401 || retryStatus === 403) {
        await clearCalendarAuthorization();
        return reconnectResponse();
      }
      return NextResponse.json({ error: "Calendar sync failed" }, { status: 502 });
    }
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
  const activeTasks = tasks ?? [];
  const { data: links } = await supabase.from("calendar_links").select("task_id,event_id").eq("user_id", auth.user.id);
  const linked = new Map((links ?? []).map((link) => [link.task_id, link.event_id]));
  const activeTaskIds = new Set(activeTasks.map((task) => task.id));

  // Completed/skipped/unscheduled tasks should no longer leave stale app-owned events behind.
  for (const link of links ?? []) {
    if (activeTaskIds.has(link.task_id)) continue;
    try {
      await calendar.events.delete({ calendarId: "primary", eventId: link.event_id });
    } catch (error) {
      const status = googleStatus(error);
      if (status === 401 || status === 403) { await clearCalendarAuthorization(); return reconnectResponse(); }
      if (!isMissingGoogleEvent(error)) return NextResponse.json({ error: "Calendar cleanup failed" }, { status: 502 });
    }
    await supabase.from("calendar_links").delete().eq("user_id", auth.user.id).eq("event_id", link.event_id);
  }

  for (const task of activeTasks) {
    const resource: calendar_v3.Schema$Event = { summary: `SSC · ${task.title}`, description: task.priority_explanation ?? undefined, start: { dateTime: task.planned_start, timeZone: "Asia/Dhaka" }, end: { dateTime: task.planned_end, timeZone: "Asia/Dhaka" }, extendedProperties: ownedTask(task.id), reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] } };
    const eventId = linked.get(task.id);
    let saved: calendar_v3.Schema$Event | null = null;
    if (eventId) {
      try {
        const response = await calendar.events.patch({ calendarId: "primary", eventId, requestBody: resource });
        saved = response.data;
      } catch (error) {
        const status = googleStatus(error);
        if (status === 401 || status === 403) { await clearCalendarAuthorization(); return reconnectResponse(); }
        if (!isMissingGoogleEvent(error)) return NextResponse.json({ error: "Calendar update failed" }, { status: 502 });
        await supabase.from("calendar_links").delete().eq("user_id", auth.user.id).eq("event_id", eventId);
      }
    }
    if (!saved) {
      try {
        const response = await calendar.events.insert({ calendarId: "primary", requestBody: resource });
        saved = response.data;
      } catch (error) {
        const status = googleStatus(error);
        if (status === 401 || status === 403) { await clearCalendarAuthorization(); return reconnectResponse(); }
        return NextResponse.json({ error: "Calendar event creation failed" }, { status: 502 });
      }
    }
    if (saved.id) {
      await supabase.from("calendar_links").upsert({ user_id: auth.user.id, task_id: task.id, event_id: saved.id, event_etag: saved.etag, calendar_id: "primary", last_app_update: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,event_id" });
    }
  }
  const refreshed = refreshedTokens.value;
  const tokenPatch = refreshed ? {
    encrypted_access_token: refreshed.access_token ? encryptToken(refreshed.access_token) : state.encrypted_access_token,
    encrypted_refresh_token: refreshed.refresh_token ? encryptToken(refreshed.refresh_token) : state.encrypted_refresh_token,
    token_expiry: refreshed.expiry_date ? new Date(refreshed.expiry_date).toISOString() : state.token_expiry,
  } : {};
  await supabase.from("sync_state").update({ ...tokenPatch, calendar_sync_token: nextSyncToken, last_successful_sync: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", auth.user.id);
  return NextResponse.json({ synced: events.filter(isOwnedEvent).length + activeTasks.length, calendarEventsRead: events.filter(isOwnedEvent).length, tasksWritten: activeTasks.length });
}
