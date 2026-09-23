"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

interface RevenueChartProps {
  points: RevenuePoint[];
  /** "day" or "month", only used to word the caption. */
  unitLabel: string;
}

/** 78,300 -> "78k", 120,000 -> "1.2L". Matches SalesOverview. */
function compactPkr(value: number): string {
  if (Math.abs(value) >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

interface TooltipEntry {
  value?: number | string;
  dataKey?: string | number;
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
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--chart-1)" }}
          aria-hidden="true"
        />
        Revenue
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {formatPrice(point.revenue)}
        </span>
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--chart-2)" }}
          aria-hidden="true"
        />
        Gross profit
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {formatPrice(point.grossProfit)}
        </span>
      </p>
    </div>
  );
}

/**
 * Revenue Over Time.
 *
 * Two series, so a legend is always present - identity is never carried
 * by colour alone. The colours are the project's existing --chart-1
 * (blue) and --chart-2 (gold) pair, which was chosen precisely because
 * the blue/cyan pair failed colourblind separation.
 *
 * Every value is derived from real sale records by
 * buildRevenueSeries(); nothing here is typed in by hand.
 */
export function RevenueChart({ points, unitLabel }: RevenueChartProps) {
  const hasAnySales = points.some((p) => p.revenue !== 0);

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border bg-card text-center sm:h-64">
        <p className="max-w-xs px-4 text-xs text-muted-foreground">
          Pick a start and end date to chart revenue over time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Revenue Over Time</h3>
        {/* Legend: always present for two series. */}
        <ul className="flex items-center gap-3 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: "var(--chart-1)" }}
              aria-hidden="true"
            />
            Revenue
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: "var(--chart-2)" }}
              aria-hidden="true"
            />
            Gross Profit
          </li>
        </ul>
      </div>

      {!hasAnySales && (
        <p className="mt-2 text-xs text-muted-foreground">
          No completed sales in this period - the line sits at zero rather than
          being hidden, so the gap is visible.
        </p>
      )}

      <div className="mt-3 h-56 w-full min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="financeRevenueFill" x1="0" y1="0" x2="0" y2="1">
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
              // Long ranges would otherwise overlap every label.
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
              fill="url(#financeRevenueFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="grossProfit"
              name="Gross Profit"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible fallback - the same pattern SalesOverview uses. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          View as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">
              Revenue and gross profit per {unitLabel}
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-medium">Period</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">Revenue</th>
                <th scope="col" className="py-1.5 text-right font-medium">Gross Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((p) => (
                <tr key={p.key}>
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted-foreground">
                    {p.label}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">
                    {formatPrice(p.revenue)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">
                    {formatPrice(p.grossProfit)}
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
