import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountStatProps {
  label: string;
  value: string;
  Icon: LucideIcon;
  /** Small note under the value, e.g. "across 3 orders". */
  hint?: string;
  /** Which accent the icon tile uses. */
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
 * One KPI tile on the account dashboard.
 *
 * Built now rather than later because the admin dashboard in Phase 1D needs
 * exactly this shape - Today's Revenue, Today's Profit, Total Stock Value.
 * Same component, different props.
 */
export function AccountStat({
  label,
  value,
  Icon,
  hint,
  tone = "cyan",
  className,
}: AccountStatProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <span
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-lg",
          TONES[tone]
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <p className="font-heading text-xl font-bold tabular-nums text-primary sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
