import type { AdaptivePlanSummary, LearningPreferences } from "./types";
const dhakaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dhakaWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  weekday: "short",
});

function isDhakaWeekend(date: Date) {
  const weekday = dhakaWeekdayFormatter.format(date);
  return weekday === "Fri" || weekday === "Sat";
}

export function dhakaDateKey(date = new Date()) {
  return dhakaDateFormatter.format(date);
}

export function dailyCapacityMinutes(preferences: Pick<LearningPreferences, "weekdayMinutes" | "weekendMinutes">, date = new Date()) {
  const configured = isDhakaWeekend(date) ? preferences.weekendMinutes : preferences.weekdayMinutes;
  return Math.max(30, Math.min(720, Math.round(configured)));
}

export function capacityDayLabel(date = new Date()) {
  return isDhakaWeekend(date) ? "Friday–Saturday capacity" : "Sunday–Thursday capacity";
}

export function isCurrentDailyPlan(summary: AdaptivePlanSummary | null | undefined, date = new Date()) {
  if (!summary?.plannedAt) return false;
  return dhakaDateKey(new Date(summary.plannedAt)) === dhakaDateKey(date);
}

export function effectiveCapacityMinutes(preferences: Pick<LearningPreferences, "weekdayMinutes" | "weekendMinutes">, summary?: AdaptivePlanSummary | null, date = new Date()) {
  return isCurrentDailyPlan(summary, date) ? summary!.availableMinutes : dailyCapacityMinutes(preferences, date);
}

export function clampFocusBlock(value: number, capacity: number) {
  const safeCapacity = Math.max(15, Math.round(capacity));
  return Math.max(15, Math.min(Math.round(value), safeCapacity));
}
