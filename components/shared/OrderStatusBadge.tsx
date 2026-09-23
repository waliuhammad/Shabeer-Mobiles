import { ORDER_STATUS_CONFIG } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

/**
 * The order status badge, shared by the customer account list, the
 * customer tracking page and the admin order screens.
 *
 * It holds NO styling of its own any more - labels and colours come from
 * lib/order-status.ts. Before that, this file had a private style map
 * and the admin side was about to grow a second one, which is how
 * "Processing" ends up cyan in one place and amber in another.
 *
 * Colour is never the only signal: the badge always carries its label.
 */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { label, badgeClass } = ORDER_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  );
}
