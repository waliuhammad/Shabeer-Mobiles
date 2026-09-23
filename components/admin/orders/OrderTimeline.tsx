import { Check, XCircle, Undo2 } from "lucide-react";
import {
  ORDER_STATUS_CONFIG,
  ORDER_TIMELINE_STATUSES,
  getOrderTimelineIndex,
} from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderTimelineProps {
  status: OrderStatus;
  /** Compact variant for the admin sidebar column. */
  dense?: boolean;
}

/**
 * Where the order has reached.
 *
 * Which steps are ticked is DERIVED from `status` via the shared config,
 * so this and the customer's tracking timeline can never disagree - they
 * read the same ORDER_TIMELINE_STATUSES array.
 *
 * `cancelled` and `returned` are exits from the flow, not steps within
 * it, so they render as their own state rather than as a step that never
 * lights up.
 *
 * A Server Component: it renders a prop and nothing else.
 */
export function OrderTimeline({ status, dense = false }: OrderTimelineProps) {
  if (status === "cancelled" || status === "returned") {
    const isCancelled = status === "cancelled";
    const Icon = isCancelled ? XCircle : Undo2;

    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          isCancelled
            ? "border-destructive/30 bg-destructive/10"
            : "border-warning/30 bg-warning/10"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            isCancelled ? "text-destructive" : "text-warning"
          )}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {ORDER_STATUS_CONFIG[status].label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ORDER_STATUS_CONFIG[status].description}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = getOrderTimelineIndex(status);

  return (
    <ol className="relative">
      {ORDER_TIMELINE_STATUSES.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === ORDER_TIMELINE_STATUSES.length - 1;
        const config = ORDER_STATUS_CONFIG[step];

        return (
          <li key={step} className={cn("flex gap-3", dense ? "pb-4" : "pb-5", "last:pb-0")}>
            {/* Marker column: dot plus the connector beneath it */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  dense ? "size-6" : "size-7",
                  isDone && "border-success bg-success text-white",
                  isCurrent && "border-secondary bg-secondary text-white",
                  !isDone && !isCurrent && "border-border bg-card text-muted-foreground"
                )}
              >
                {isDone || isCurrent ? (
                  <Check className={dense ? "size-3" : "size-3.5"} aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" aria-hidden="true" />
                )}
              </span>

              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 w-0.5 flex-1 rounded-full",
                    isDone ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>

            <div className="pt-0.5">
              <p
                className={cn(
                  "font-semibold",
                  dense ? "text-xs" : "text-sm",
                  isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {config.label}
                {isCurrent && (
                  // Text, not colour alone - the current step is
                  // identifiable without being able to see the difference.
                  <span className="ml-2 rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-medium text-secondary">
                    Current
                  </span>
                )}
              </p>
              {!dense && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {config.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
