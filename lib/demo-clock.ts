/**
 * THE demo clock.
 *
 * Every mock dataset in this project is seeded against a fixed instant
 * rather than `Date.now()`, so that:
 *
 *   1. Server and client render identical output (no hydration mismatch
 *      from a clock that ticked between the two), and
 *   2. "Today's Revenue" means something stable while you are learning -
 *      the seeded sales do not silently fall out of range tomorrow.
 *
 * data/orders.ts, data/mock-purchases.ts and data/mock-inventory.ts all
 * already used this instant privately. Finance needs the SAME instant to
 * decide what "today" and "this month" mean, so it now lives in one place
 * instead of being re-typed in each seed file.
 *
 * PHASE 2: when real data arrives this becomes `new Date()` and nothing
 * else in the finance layer changes - every period calculation already
 * goes through `now()` rather than constructing its own clock.
 */
export const DEMO_NOW_ISO = "2026-09-23T10:00:00.000Z";

export const DEMO_NOW = new Date(DEMO_NOW_ISO).getTime();

/** The instant every finance calculation treats as "now". */
export function now(): Date {
  return new Date(DEMO_NOW);
}

/** Seed helper: an ISO timestamp N days before the demo clock. */
export function daysAgo(days: number): string {
  return new Date(DEMO_NOW - days * 86_400_000).toISOString();
}

/** Seed helper: an ISO timestamp N hours before the demo clock. */
export function hoursAgo(hours: number): string {
  return new Date(DEMO_NOW - hours * 3_600_000).toISOString();
}
