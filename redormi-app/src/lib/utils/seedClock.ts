// A fixed reference "now" for generating mock/seed data (offers, deals,
// bookings, swap proposals, message timestamps, etc).
//
// The app is statically exported: every page is rendered once at build
// time, then hydrated again in the visitor's browser, which re-evaluates
// this module from scratch. If seed data were generated from the *real*
// `Date.now()`, the build-time and hydration-time values would differ and
// React would throw a hydration mismatch on every date derived from them.
// Anchoring seed data to a fixed instant keeps it fully deterministic
// across both renders. Live, user-driven interactions (e.g. picking a
// check-in date) should use `isoToday()` from `format.ts` instead, and
// only ever inside a `useEffect` / event handler so it never affects the
// server-rendered HTML.
export const SEED_NOW_MS = new Date("2026-09-02T12:00:00.000Z").getTime();

export function seedToday(offsetDays = 0): string {
  const d = new Date(SEED_NOW_MS);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function seedHoursAgo(hours: number): string {
  return new Date(SEED_NOW_MS - hours * 3600 * 1000).toISOString();
}

export function seedHoursFromNow(hours: number): string {
  return new Date(SEED_NOW_MS + hours * 3600 * 1000).toISOString();
}
