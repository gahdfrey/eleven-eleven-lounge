/** Nigeria is UTC+1 all year (no daylight saving). */
const TZ = "Africa/Lagos";
const OFFSET = "+01:00";

export function lagosDateString(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

/** Start of a Lagos calendar day (YYYY-MM-DD) as a Date. */
export function startOfLagosDay(day: string) {
  return new Date(`${day}T00:00:00${OFFSET}`);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400_000);
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, timeStyle: "short" }).format(new Date(d));
}

export function formatEventDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
}

/** For <input type="datetime-local"> values in Lagos time. */
export function toLagosInputValue(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = new Date(new Date(d).getTime() + 3600_000);
  return date.toISOString().slice(0, 16);
}

export function fromLagosInputValue(v: string) {
  return v ? new Date(`${v}:00${OFFSET}`).toISOString() : null;
}

export function timeAgo(d: Date | string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
