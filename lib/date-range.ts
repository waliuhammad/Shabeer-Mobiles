import { now } from "@/lib/demo-clock";

/**
 * THE period helper.
 *
 * Before this file, three near-identical "all | today | 7d | 30d" filters
 * existed privately in order-display.ts, purchase-utils.ts and the sales
 * chart, and none of them could do a week, a calendar month or a custom
 * range. Finance needs all of those, and it needs every page to agree on
 * where a period starts - otherwise /admin/revenue and /admin/profit-loss
 * can legitimately disagree about the same month.
 *
 * TIMEZONE RULE
 * -------------
 * A shop's day is a LOCAL day. A sale at 9pm on the 23rd belongs to the
 * 23rd, not to the 24th because UTC rolled over. So every boundary here
 * is computed in local time via setHours/getDate, never by slicing the
 * ISO string. The off-by-one this avoids is the classic one: comparing
 * iso.slice(0, 10) against a local date gives the wrong day for any sale
 * made after 7pm in Pakistan (UTC+5).
 *
 * Everything that consumes this runs in a client component, so "local"
 * is always the shop's own browser - there is no server/client clock
 * disagreement to hydrate around.
 */

export type PeriodId =
  | "today"
  | "week"
  | "month"
  | "7d"
  | "30d"
  | "12m"
  | "all"
  | "custom";

export interface DateRange {
  /** Inclusive start, local midnight. null = open-ended. */
  start: Date | null;
  /** Inclusive end, local 23:59:59.999. null = open-ended. */
  end: Date | null;
}

export const PERIOD_LABELS: Record<PeriodId, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "12m": "Last 12 Months",
  all: "All Time",
  custom: "Custom Range",
};

/** Periods offered on the Profit and Loss page. */
export const PROFIT_LOSS_PERIODS: PeriodId[] = ["today", "week", "month", "custom"];

/** Periods offered on the Revenue page and its chart. */
export const REVENUE_PERIODS: PeriodId[] = ["7d", "30d", "12m", "all", "custom"];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Monday-start week. getDay() returns 0 for Sunday, so Sunday folds back
 * six days rather than forward one.
 */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const weekday = d.getDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - back);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

/**
 * Resolve a period id into concrete bounds.
 *
 * "custom" takes the two picker strings ("YYYY-MM-DD"), parsed as LOCAL
 * dates on purpose: new Date("2026-09-01") parses as UTC midnight, which
 * in Pakistan is 5am on the 1st, silently dropping any sale made between
 * local midnight and 5am.
 */
export function resolvePeriod(
  period: PeriodId,
  customStart?: string,
  customEnd?: string
): DateRange {
  const today = now();

  switch (period) {
    case "today":
      return { start: startOfDay(today), end: endOfDay(today) };

    case "week":
      return { start: startOfWeek(today), end: endOfDay(today) };

    case "month":
      return { start: startOfMonth(today), end: endOfDay(today) };

    case "7d": {
      const start = startOfDay(today);
      start.setDate(start.getDate() - 6); // 6 back + today = 7 days
      return { start, end: endOfDay(today) };
    }

    case "30d": {
      const start = startOfDay(today);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(today) };
    }

    case "12m": {
      const start = startOfMonth(today);
      start.setMonth(start.getMonth() - 11); // 11 back + this month = 12
      return { start, end: endOfDay(today) };
    }

    case "custom": {
      const start = customStart ? startOfDay(parseLocalDate(customStart)) : null;
      const end = customEnd ? endOfDay(parseLocalDate(customEnd)) : null;
      return { start, end };
    }

    case "all":
    default:
      return { start: null, end: null };
  }
}

/** "2026-09-01" to local midnight on 1 Sep 2026, NOT UTC midnight. */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Date to "YYYY-MM-DD" in LOCAL time, for input[type=date] values. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Is this ISO timestamp inside the range? Open-ended bounds always pass. */
export function isWithinRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t > range.end.getTime()) return false;
  return true;
}

/**
 * A custom range entered backwards is invalid rather than merely empty,
 * so the UI can say so instead of showing a confident Rs 0.
 */
export function isValidRange(range: DateRange): boolean {
  if (!range.start || !range.end) return true;
  return range.start.getTime() <= range.end.getTime();
}

export function formatRangeLabel(range: DateRange): string {
  if (!range.start && !range.end) return "All time";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  if (range.start && range.end) {
    return fmt(range.start) === fmt(range.end)
      ? fmt(range.start)
      : `${fmt(range.start)} - ${fmt(range.end)}`;
  }
  return range.start ? `From ${fmt(range.start)}` : `Until ${fmt(range.end as Date)}`;
}

// ---------------------------------------------------------------------
// Chart bucketing
// ---------------------------------------------------------------------

export type BucketUnit = "day" | "month";

export interface Bucket {
  /** Identity key: "2026-09-23" for a day, "2026-09" for a month. */
  key: string;
  /** Axis label: "23 Sep" for a day, "Sep 26" for a month. */
  label: string;
  start: Date;
  end: Date;
}

/** Which bucket size suits this period - 12 months is unreadable by day. */
export function bucketUnitFor(period: PeriodId, range: DateRange): BucketUnit {
  if (period === "12m") return "month";
  if (!range.start || !range.end) return "month";
  const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000);
  return days > 62 ? "month" : "day";
}

/**
 * Every bucket in the range, INCLUDING empty ones. A day with no sales
 * must still appear as zero - dropping it would compress the x-axis and
 * imply trading was continuous when it was not.
 */
export function buildBuckets(range: DateRange, unit: BucketUnit): Bucket[] {
  if (!range.start || !range.end) return [];
  const buckets: Bucket[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");

  if (unit === "day") {
    const cursor = startOfDay(range.start);
    while (cursor.getTime() <= range.end.getTime()) {
      buckets.push({
        key: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`,
        label: cursor.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        start: startOfDay(cursor),
        end: endOfDay(cursor),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  const cursor = startOfMonth(range.start);
  while (cursor.getTime() <= range.end.getTime()) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    buckets.push({
      key: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`,
      label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      start: new Date(cursor),
      end: endOfDay(new Date(next.getTime() - 86_400_000)),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

/** Which bucket key does this timestamp fall in? Must match buildBuckets. */
export function bucketKeyFor(iso: string, unit: BucketUnit): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return unit === "day"
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
