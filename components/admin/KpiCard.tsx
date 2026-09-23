import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  /** Pre-formatted. This card does no maths - see the note below. */
  value: string;
  Icon: LucideIcon;
  /** Percentage change. Negative renders as a fall. */
  changePercent?: number;
  /** What the change compares against, e.g. "from yesterday". */
  changeLabel?: string;
  /** Replaces the change row entirely when there is nothing to compare. */
  description?: string;
  tone?: "navy" | "cyan" | "gold" | "success";
  className?: string;
}

const TONES = {
  navy: "bg-primary text-accent",
  cyan: "bg-cyan-soft text-secondary",
  gold: "bg-accent text-accent-foreground",
  success: "bg-success/10 text-success",
} as const;

/**
 * One dashboard KPI tile.
 *
 * `value` arrives as a finished string rather than a number, on purpose.
 * The card must never decide how money is formatted or how profit is
 * derived - that belongs to the data layer, and later to trusted server
 * code that has access to purchase prices. A tile that could compute
 * margin would need cost data in the browser, which is the one thing the
 * cashier's session must not contain.
 *
 * A Server Component - four of these ship zero JavaScript.
 */
export function KpiCard({
  title,
  value,
  Icon,
  changePercent,
  changeLabel,
  description,
  tone = "cyan",
  className,
}: KpiCardProps) {
  const hasChange = typeof changePercent === "number";
  const isUp = hasChange && changePercent >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            TONES[tone]
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 font-heading text-xl font-bold tabular-nums text-primary sm:text-2xl">
        {value}
      </p>

      {hasChange ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
          {/* The arrow is a second cue alongside the colour, so a reader
              who cannot distinguish red from green still sees direction. */}
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              isUp ? "text-success" : "text-destructive"
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {isUp ? "+" : ""}
            {changePercent}%
          </span>
          {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
        </p>
      ) : (
        description && (
          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
        )
      )}
    </article>
  );
}
