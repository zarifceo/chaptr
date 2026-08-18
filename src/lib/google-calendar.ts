import { google } from "googleapis";
import { decryptToken } from "@/lib/token-crypto";

export const calendarScopes = ["https://www.googleapis.com/auth/calendar.events.owned"];

export function googleOAuth() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REDIRECT_URI) throw new Error("Google Calendar OAuth is not configured");
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI);
}

export type GoogleTokenUpdate = { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };

export function authorizedGoogle(state: { encrypted_access_token: string | null; encrypted_refresh_token: string | null; token_expiry: string | null }, onTokens?: (tokens: GoogleTokenUpdate) => void) {
  const auth = googleOAuth();
  auth.setCredentials({
    access_token: state.encrypted_access_token ? decryptToken(state.encrypted_access_token) : undefined,
    refresh_token: state.encrypted_refresh_token ? decryptToken(state.encrypted_refresh_token) : undefined,
    expiry_date: state.token_expiry ? new Date(state.token_expiry).getTime() : undefined,
  });
  if (onTokens) auth.on("tokens", onTokens);
  return auth;
}

export const ownedTask = (taskId: string) => ({ private: { sscOwned: "true", sscTaskId: taskId } });
export const isOwnedEvent = (event: { extendedProperties?: { private?: Record<string, string> | null } | null }) => event.extendedProperties?.private?.sscOwned === "true";
