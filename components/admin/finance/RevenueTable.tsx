import { Banknote } from "lucide-react";
import { formatMargin } from "@/lib/finance-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

interface RevenueTableProps {
  points: RevenuePoint[];
  /** "day" or "month" - only used to word the heading and the caption. */
  unitLabel: string;
  /** Heading above the table. */
  title?: string;
  /** Optional controls rendered on the right of the heading row. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Revenue over time, WRITTEN OUT, one row per period.
 *
 * This replaces the area chart that used to sit here, at the shop's
 * request. The figures are the same ones from the same
 * buildRevenueSeries() call - only the presentation changed.
 *
 * A table is not a downgrade for this data. A shopkeeper reconciling a
 * till wants to read "Rs 4,299" for a specific Tuesday, and a chart
 * gives an approximate height you have to hover to resolve. What a
 * chart buys is shape - whether the month is climbing - and that is
 * genuinely lost here; the totals row is the partial answer.
 *
 * EVERY PERIOD IS LISTED, including the ones with nothing in them.
 * Dropping empty days would silently turn "we sold nothing on Tuesday"
 * into "Tuesday did not happen", and the gap in a run of dates is
 * exactly what a shop needs to see. They are dimmed, not hidden.
 */
export function RevenueTable({
  points,
  unitLabel,
  title = "Revenue Over Time",
  action,
  className,
}: RevenueTableProps) {
  const totals = points.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      grossProfit: acc.grossProfit + p.grossProfit,
    }),
    { revenue: 0, grossProfit: 0 }
  );

  const margin = (revenue: number, grossProfit: number) =>
    revenue > 0 ? (grossProfit / revenue) * 100 : null;

  const hasActivity = points.some((p) => p.revenue !== 0 || p.grossProfit !== 0);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            One row per {unitLabel}. Revenue is what was billed; gross profit is
            what was left after what the goods cost.
          </p>
        </div>
        {action}
      </div>

      {points.length === 0 || !hasActivity ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Banknote className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            No sales in this period
          </p>
          <p className="max-w-xs px-4 text-xs text-muted-foreground">
            Every {unitLabel} in the range is zero. Only delivered online orders
            and completed counter sales count.
          </p>
        </div>
      ) : (
        /**
         * Capped and scrolled rather than allowed to run on: a 30-day
         * range is 30 rows, and on the dashboard that would push
         * everything below it off the screen. The header stays put so
         * the columns are still named at row 28.
         */
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Revenue and gross profit for each {unitLabel} in the selected
              period
            </caption>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {unitLabel === "month" ? "Month" : "Date"}
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Revenue
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Gross Profit
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Margin
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {points.map((p) => {
                const quiet = p.revenue === 0 && p.grossProfit === 0;
                return (
                  <tr
                    key={p.key}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      quiet && "text-muted-foreground"
                    )}
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium"
                    >
                      {p.label}
                    </th>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-right tabular-nums",
                        quiet ? "" : "font-semibold text-foreground"
                      )}
                    >
                      {formatPrice(p.revenue)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-right tabular-nums",
                        // A loss is worth seeing at a glance; it happens
                        // when a sale went out below what it cost.
                        !quiet && p.grossProfit < 0 && "font-semibold text-destructive"
                      )}
                    >
                      {formatPrice(p.grossProfit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatMargin(margin(p.revenue, p.grossProfit))}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="sticky bottom-0">
              <tr className="border-t-2 border-border bg-muted text-sm">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-foreground">
                  Total
                </th>
                <td className="whitespace-nowrap px-3 py-3 text-right font-heading font-bold tabular-nums text-foreground">
                  {formatPrice(totals.revenue)}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-right font-heading font-bold tabular-nums",
                    totals.grossProfit < 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  {formatPrice(totals.grossProfit)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                  {formatMargin(margin(totals.revenue, totals.grossProfit))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
