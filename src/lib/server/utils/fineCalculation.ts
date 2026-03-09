// Client-side fine calculation utility
// No server imports — settings must be passed in directly.

export interface FineSettings {
  holidays?: { date: string }[];       // array of { date: "YYYY-MM-DD" }
  closedWeekdays?: number[];            // 0 = Sunday … 6 = Saturday
  excludeSundays?: boolean;
}

function isDateExempt(date: Date, settings: FineSettings | null): boolean {
  if (!settings) return false;

  const ymd = date.toISOString().split('T')[0];

  if (Array.isArray(settings.holidays)) {
    for (const h of settings.holidays) {
      if (h && h.date === ymd) return true;
    }
  }

  const wd = date.getDay();
  if (Array.isArray(settings.closedWeekdays) && settings.closedWeekdays.includes(wd)) return true;
  if (settings.excludeSundays && wd === 0) return true;

  return false;
}

/**
 * Calculate the fine amount in centavos.
 *
 * @param dueDate     - The date the book was due.
 * @param currentDate - Today's date (defaults to `new Date()`).
 * @param settings    - Fine settings (holidays, closed weekdays, etc.).
 *                      Pass `null` to treat every day as chargeable.
 */
export function calculateFineAmount(
  dueDate: Date,
  currentDate: Date = new Date(),
  settings: FineSettings | null = null,
): number {
  const normalizedDue = new Date(dueDate);
  normalizedDue.setUTCHours(0, 0, 0, 0);
  const normalizedNow = new Date(currentDate);
  normalizedNow.setUTCHours(0, 0, 0, 0);

  if (normalizedNow <= normalizedDue) return 0;

  let totalNonExemptHours = 0;
  const start = new Date(dueDate);
  const end = new Date(currentDate);

  // Advance cursor to the next whole hour after dueDate
  let cursor = new Date(start.getTime());
  if (cursor.getMinutes() !== 0 || cursor.getSeconds() !== 0 || cursor.getMilliseconds() !== 0) {
    cursor.setMinutes(0, 0, 0);
    cursor.setHours(cursor.getHours() + 1);
  }

  while (cursor <= end) {
    const dayStart = new Date(cursor);
    dayStart.setHours(0, 0, 0, 0);

    if (!isDateExempt(dayStart, settings)) {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const from = cursor > dayStart ? cursor : dayStart;
      const to = end < dayEnd ? end : dayEnd;
      const ms = Math.max(0, to.getTime() - from.getTime());
      const hours = Math.ceil(ms / (1000 * 60 * 60));
      totalNonExemptHours += hours;
    }

    // Advance to next day
    cursor = new Date(dayStart);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return totalNonExemptHours * 500; // centavos
}

/**
 * Calculate the number of chargeable overdue days.
 *
 * @param dueDate     - The date the book was due.
 * @param currentDate - Today's date (defaults to `new Date()`).
 * @param settings    - Fine settings (holidays, closed weekdays, etc.).
 */
export function calculateDaysOverdue(
  dueDate: Date,
  currentDate: Date = new Date(),
  settings: FineSettings | null = null,
): number {
  const normalizedDue = new Date(dueDate);
  normalizedDue.setUTCHours(0, 0, 0, 0);
  const normalizedNow = new Date(currentDate);
  normalizedNow.setUTCHours(0, 0, 0, 0);

  if (normalizedNow <= normalizedDue) return 0;

  let count = 0;
  const cursor = new Date(dueDate);
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= currentDate) {
    if (!isDateExempt(cursor, settings)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}