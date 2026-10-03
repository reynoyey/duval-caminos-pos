import { STORE_TZ } from "./utils";

/** Asia/Jakarta is a fixed UTC+7 offset (no DST). */
const OFFSET = "+07:00";

/** "2026-10-03" for a given instant, in store timezone. */
export function jakartaDateString(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** [start, end) UTC instants covering a calendar day in Jakarta. */
export function jakartaDayRange(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error("Format tanggal harus YYYY-MM-DD");
  const start = new Date(`${dateStr}T00:00:00${OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** "261003" — used in order numbers. */
export function jakartaDateKey(d: Date = new Date()) {
  return jakartaDateString(d).slice(2).replace(/-/g, "");
}
