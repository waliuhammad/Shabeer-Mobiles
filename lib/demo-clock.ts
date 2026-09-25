/**
 * THE clock every finance calculation reads.
 *
 * IT USED TO BE FROZEN, and that has now been switched off.
 *
 * While this project ran on seeded demo data, `now()` returned a fixed
 * instant - 2026-09-23T10:00:00Z - for two good reasons: the server and
 * the client rendered identical output, and "Today's Revenue" meant
 * something stable while the seeded sales sat in a known range.
 *
 * Both reasons expired when the shop started recording real sales. A
 * frozen clock against live data is silently wrong in the worst
 * direction: a sale rung up at the counter today falls OUTSIDE "today",
 * "this week" and "this month", so the figures quietly understate the
 * business and nobody can tell by looking. By the time anyone noticed,
 * the clock was three days behind.
 *
 * The file is kept, rather than deleted and its callers rewritten,
 * because routing every period calculation through one function is
 * exactly what made this a one-line change. lib/date-range.ts,
 * ProfitLossView, RevenueView, ReportsView and ExpenseForm all ask here
 * instead of constructing their own `new Date()`, so there is one place
 * to be right - or, as it turned out, one place to be wrong.
 *
 * ON HYDRATION: callers use this for DAY boundaries (start of today,
 * start of this month) and for date-input defaults, so a few
 * milliseconds of drift between the server render and the client render
 * produces the same string. The one exception is a page rendered across
 * midnight, which corrects itself on the next interaction.
 */

/** The instant every finance calculation treats as "now". */
export function now(): Date {
  return new Date();
}

/**
 * Seed helpers, still used by the remaining data/*.ts fixtures.
 *
 * These deliberately keep a FIXED origin. A fixture that moves with the
 * wall clock is not a fixture - it produces different output on every
 * run, and a test written against it fails tomorrow for no reason.
 */
const FIXTURE_ORIGIN = new Date("2026-09-23T10:00:00.000Z").getTime();

/**
 * The fixture origin, for the few remaining data/*.ts seed files that
 * date their rows from it.
 *
 * FOR FIXTURES ONLY. It is emphatically not "now" - that is now(), above.
 * This kept its old name so the seed files did not all need editing, but
 * anything reading it to decide what "today" means is wrong.
 */
export const DEMO_NOW = FIXTURE_ORIGIN;

/** An ISO timestamp N days before the fixture origin. */
export function daysAgo(days: number): string {
  return new Date(FIXTURE_ORIGIN - days * 86_400_000).toISOString();
}

/** An ISO timestamp N hours before the fixture origin. */
export function hoursAgo(hours: number): string {
  return new Date(FIXTURE_ORIGIN - hours * 3_600_000).toISOString();
}
