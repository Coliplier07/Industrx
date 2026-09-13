export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// startDay: 0 = Sunday .. 6 = Saturday, per company.pay_period_start_day.
export function getWeekRange(referenceDate: Date, startDay: number = 0): { start: string; end: string } {
  const day = referenceDate.getDay();
  const diff = (day - startDay + 7) % 7;
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

// Local calendar date, not UTC — toISOString() converts to UTC first, which
// rolls the date forward a day in the evening for any timezone behind UTC
// (all of the US), silently misfiling entries submitted at night.
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const startLabel = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}
