"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { buildRevenueSeries, getRevenueEntries } from "@/lib/finance-utils";
import { bucketUnitFor, resolvePeriod, type PeriodId } from "@/lib/date-range";
import { formatPrice, cn } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

/**
 * Sales over time - now built from REAL sales.
 *
 * This used to render a hard-coded array in data/admin.ts. It read like
 * a working dashboard and agreed with nothing: the chart said one thing,
 * /admin/revenue said another, and neither came from a sale.
 *
 * It now goes through the same finance layer as /admin/revenue and
 * /admin/profit-loss - getRevenueEntries() then buildRevenueSeries() -
 * so all three cannot disagree. An empty shop draws a flat line at zero,
 * which is the honest picture rather than an invented one.
 */

const RANGES: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "12m", label: "12 Months" },
];

/** 78,300 -> "78k", 120,000 -> "1.2L" */
function compactPkr(value: number): string {
  if (Math.abs(value) >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

interface TooltipEntry {
  payload?: RevenuePoint;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Revenue{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {formatPrice(point.revenue)}
        </span>
      </p>
    </div>
  );
}

export function SalesOverview() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const [rangeId, setRangeId] = useState<PeriodId>("7d");

  const { points, total } = useMemo(() => {
    const range = resolvePeriod(rangeId);
    const entries = getRevenueEntries(orders, invoices, range);
    const unit = bucketUnitFor(rangeId, range);
    const series = buildRevenueSeries(entries, range, unit);
    return {
      points: series,
      total: entries.reduce((sum, e) => sum + e.revenue, 0),
    };
  }, [orders, invoices, rangeId]);

  const hasAnySales = points.some((p) => p.revenue !== 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sales Overview</h3>
          <p className="font-heading text-xl font-bold tabular-nums text-primary">
            {formatPrice(total)}
          </p>
        </div>

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

      {!hasAnySales && (
        <p className="mt-2 text-xs text-muted-foreground">
          No completed sales in this period. The line sits at zero rather than
          being hidden, so the gap is visible.
        </p>
      )}

      <div className="mt-3 h-56 w-full min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              dy={6}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={compactPkr}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible fallback - a chart nobody can read is not data. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Revenue per period</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-medium">Period</th>
                <th scope="col" className="py-1.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((p) => (
                <tr key={p.key}>
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted-foreground">
                    {p.label}
                  </th>
                  <td className="py-1.5 text-right tabular-nums text-foreground">
                    {formatPrice(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
