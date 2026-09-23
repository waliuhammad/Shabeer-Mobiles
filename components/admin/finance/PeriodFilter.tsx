"use client";

import { cn } from "@/lib/utils";
import { PERIOD_LABELS, type PeriodId } from "@/lib/date-range";

interface PeriodFilterProps {
  periods: PeriodId[];
  value: PeriodId;
  onChange: (period: PeriodId) => void;
  customStart: string;
  customEnd: string;
  onCustomStart: (value: string) => void;
  onCustomEnd: (value: string) => void;
  /** Shown when the custom range is the wrong way round. */
  error?: string;
}

/**
 * The period selector, shared by /admin/revenue and /admin/profit-loss.
 *
 * ONE component so the two pages cannot drift into offering different
 * periods or interpreting "This Month" differently - the same reason
 * there is only one finance calculation layer behind them.
 *
 * Pills rather than a dropdown, matching the existing sales chart's
 * range switcher, with aria-pressed so the choice is announced.
 */
export function PeriodFilter({
  periods,
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
  error,
}: PeriodFilterProps) {
  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Select a period"
        className="flex flex-wrap gap-1.5"
      >
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={value === period}
            onClick={() => onChange(period)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              value === period
                ? "border-secondary bg-cyan-soft text-secondary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>

      {value === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="period-start" className="sr-only">
            Period start date
          </label>
          <input
            id="period-start"
            type="date"
            value={customStart}
            onChange={(e) => onCustomStart(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <label htmlFor="period-end" className="sr-only">
            Period end date
          </label>
          <input
            id="period-end"
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEnd(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
