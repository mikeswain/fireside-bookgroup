/**
 * Returns the first Tuesday of the given month/year at 19:00 as an ISO string.
 * Month is 1-based (1 = January).
 */
export function getFirstTuesday(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  const dayOfWeek = date.getDay();
  // Tuesday = 2; calculate days to add
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  date.setDate(1 + daysUntilTuesday);
  date.setHours(19, 0, 0, 0);
  return date.toISOString();
}

/** Returns { month, year } for the next month from today. */
export function getNextMonth(): { month: number; year: number } {
  const now = new Date();
  const month = now.getMonth() + 2; // getMonth is 0-based, +1 for 1-based, +1 for next
  if (month > 12) return { month: 1, year: now.getFullYear() + 1 };
  return { month, year: now.getFullYear() };
}
