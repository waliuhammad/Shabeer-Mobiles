"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { RevenueTable } from "@/components/admin/finance/RevenueTable";
import { buildRevenueSeries, filterBySeller, getRevenueEntries } from "@/lib/finance-utils";
import { COUNTER_SELLERS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bucketUnitFor, resolvePeriod, type PeriodId } from "@/lib/date-range";
import { formatPrice, cn } from "@/lib/utils";

/**
 * Sales over time, built from REAL sales.
 *
 * This used to render a hard-coded array in data/admin.ts. It read like
 * a working dashboard and agreed with nothing: the chart said one thing,
 * /admin/revenue said another, and neither came from a sale. It now goes
 * through the same finance layer as /admin/revenue and
 * /admin/profit-loss - getRevenueEntries() then buildRevenueSeries() -
 * so all three cannot disagree.
 *
 * WRITTEN OUT RATHER THAN DRAWN, at the shop's request. The area chart
 * that used to sit here is gone, and with it the last use of recharts.
 *
 * The figures were already here: the chart carried a "View as table"
 * fallback folded away in a <details>, added so a chart nobody can read
 * is still data. That table is now simply the content, which is the
 * better arrangement anyway - the accessible version and the version
 * everyone else sees are the same thing, so they cannot drift.
 */

const RANGES: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "12m", label: "12 Months" },
];

export function SalesOverview() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const [rangeId, setRangeId] = useState<PeriodId>("7d");
  /** "all", or one of the two owners. */
  const [seller, setSeller] = useState<string>("all");

  const { points, unit, total } = useMemo(() => {
    const range = resolvePeriod(rangeId);
    /**
     * Filtered BEFORE the series is built, so the table, the headline
     * total and the margin all describe the same set of sales. Filtering
     * afterwards would leave the total saying one thing and the rows
     * another.
     */
    const entries = filterBySeller(getRevenueEntries(orders, invoices, range), seller);
    const bucket = bucketUnitFor(rangeId, range);
    return {
      points: buildRevenueSeries(entries, range, bucket),
      unit: bucket,
      total: entries.reduce((sum, e) => sum + e.revenue, 0),
    };
  }, [orders, invoices, rangeId, seller]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sales Overview</h3>
          <p className="font-heading text-xl font-bold tabular-nums text-primary">
            {formatPrice(total)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Filter by who sold it">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sellers</SelectItem>
              {COUNTER_SELLERS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div role="group" aria-label="Select a period" className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={rangeId === r.id}
              onClick={() => setRangeId(r.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                rangeId === r.id
                  ? "border-secondary bg-cyan-soft text-secondary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {seller !== "all" && (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing only sales recorded as sold by{" "}
          <span className="font-semibold text-foreground">{seller}</span>. Online
          orders and older counter sales carry no seller, so they are not here.
        </p>
      )}

      <RevenueTable points={points} unitLabel={unit} title="Sales by period" />
    </div>
  );
}
