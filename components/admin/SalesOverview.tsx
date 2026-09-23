"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { salesRangeOrder, salesRanges } from "@/data/admin";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SalesPoint, SalesRangeId } from "@/types";

/** Compact axis labels: 78300 -> "78k". Full values live in the tooltip. */
function compactPkr(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

interface TooltipEntry {
  value?: number | string;
  payload?: SalesPoint;
}

/**
 * The hover layer. An HTML chart is interactive by default, so a line or
 * area chart ships a crosshair and tooltip rather than making the reader
 * guess values off the axis.
 */
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
  const value = payload[0]?.value;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-sm font-bold tabular-nums text-primary">
        {typeof value === "number" ? formatPrice(value) : value}
      </p>
    </div>
  );
}

/**
 * Revenue over time.
 *
 * FORM: change-over-time on a continuous scale -> a line/area chart. One
 * series only, so there is no legend: the heading already names what the
 * line is, and a legend box for a single series is noise.
 *
 * COLOUR: --chart-1, the brand-derived blue that passed the categorical
 * palette checks. The fill is the same hue faded, not a second colour.
 *
 * MARKS: 2px stroke, recessive grid (horizontal only), axes with no lines
 * or ticks. The data is the ink; the scaffolding stays quiet.
 *
 * "use client" because Recharts measures the DOM to size itself, and the
 * range filter is state.
 */
export function SalesOverview() {
  const [rangeId, setRangeId] = useState<SalesRangeId>("7d");
  const range = salesRanges[rangeId];

  const total = range.points.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
      {/* Header + filters. Filters sit in one row above the chart. */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-primary">
            Sales Overview
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Revenue &middot;{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatPrice(total)}
            </span>{" "}
            total for {range.label.toLowerCase()}
          </p>
        </div>

        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
          role="group"
          aria-label="Select time range"
        >
          {salesRangeOrder.map((id) => {
            const isActive = id === rangeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setRangeId(id)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {salesRanges[id].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ResponsiveContainer measures its parent, so the chart can never
          force horizontal page scroll on a narrow screen. */}
      <div className="h-56 w-full min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={range.points}
            margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Horizontal lines only - vertical ones add clutter without
                helping anyone read a value. */}
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              dy={6}
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
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              // Markers appear on hover only - a dot on every point turns
              // a trend line into a bead necklace.
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              // No entry animation: a dashboard should be readable the
              // instant it paints, and a growing area is a chart that is
              // briefly showing the wrong numbers.
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* The table view: the same numbers in text, for anyone who cannot
          read the chart - screen readers included. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
          View as table
        </summary>
        <table className="mt-2 w-full text-xs">
          <caption className="sr-only">
            Revenue for each point in the selected range
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-1 font-medium">Period</th>
              <th scope="col" className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {range.points.map((point) => (
              <tr key={point.label}>
                <th scope="row" className="py-1 text-left font-normal text-foreground">
                  {point.label}
                </th>
                <td className="py-1 text-right tabular-nums text-foreground">
                  {formatPrice(point.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
