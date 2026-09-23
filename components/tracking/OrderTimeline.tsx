import { Check, XCircle } from "lucide-react";
import { TRACKING_STEPS, getStatusIndex } from "@/lib/order-utils";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderTimelineProps {
  status: OrderStatus;
}

/**
 * Order Placed -> Confirmed -> Shipped -> Out for Delivery -> Delivered.
 *
 * Which steps are ticked is DERIVED from `status` rather than stored
 * separately, so the badge on the account page and the ticks here can never
 * disagree about where an order actually is.
 *
 * A Server Component - it renders a prop and nothing more.
 */
export function OrderTimeline({ status }: OrderTimelineProps) {
  if (status === "cancelled") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">Order cancelled</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Please contact the shop if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = getStatusIndex(status);

  return (
    <ol className="relative">
      {TRACKING_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === TRACKING_STEPS.length - 1;

        return (
          <li key={step.status} className="flex gap-4 pb-6 last:pb-0">
            {/* Marker column: the dot plus the connecting line below it */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && "border-success bg-success text-white",
                  isCurrent && "border-secondary bg-secondary text-white",
                  !isDone && !isCurrent && "border-border bg-card text-muted-foreground"
                )}
              >
                {isDone || isCurrent ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <span className="size-2 rounded-full bg-border" aria-hidden="true" />
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

            <div className="pb-1 pt-0.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
                {isCurrent && (
                  // Text, not just colour - the current step is identifiable
                  // without relying on being able to see the difference.
                  <span className="ml-2 rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-medium text-secondary">
                    Current
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
