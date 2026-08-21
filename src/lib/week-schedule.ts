/** Bangladesh school-week convention: Friday and Saturday are weekend days. */
export const BANGLADESH_WEEKEND_DAY_NUMBERS = [5, 6] as const;

export function isBangladeshWeekend(dayOfWeek: number) {
  return BANGLADESH_WEEKEND_DAY_NUMBERS.includes(dayOfWeek as (typeof BANGLADESH_WEEKEND_DAY_NUMBERS)[number]);
}
