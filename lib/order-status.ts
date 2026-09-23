import type { OrderStatus, PaymentStatus } from "@/types";

/**
 * THE single source of truth for order status meaning and movement.
 *
 * Labels, badge styling and the transition rules all live here, so the
 * admin table, the admin detail page, the customer account list and the
 * customer tracking timeline cannot disagree about what "PROCESSING"
 * looks like or means. Before this file, STATUS_LABELS lived in
 * order-utils and the badge colours lived inside a component - two
 * places, and a third about to be added.
 */

interface StatusConfig {
  label: string;
  /** Badge classes. Colour is never the only signal - the label ships
   *  with it everywhere it is used. */
  badgeClass: string;
  /** One line for the customer-facing timeline. */
  description: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-muted text-muted-foreground",
    description: "We have received your order.",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass: "bg-cyan-soft text-secondary",
    description: "We called to confirm and your items are reserved.",
  },
  processing: {
    label: "Processing",
    badgeClass: "bg-cyan-soft text-secondary",
    description: "Your items are being checked and packed.",
  },
  ready: {
    label: "Ready",
    badgeClass: "bg-primary/10 text-primary",
    description: "Packed and ready to collect or dispatch.",
  },
  shipped: {
    label: "Shipped",
    badgeClass: "bg-accent/20 text-gold-deep",
    description: "Your order has left the shop.",
  },
  "out-for-delivery": {
    label: "Out for Delivery",
    badgeClass: "bg-accent/20 text-gold-deep",
    description: "The rider is on the way to your address.",
  },
  delivered: {
    label: "Delivered",
    badgeClass: "bg-success/10 text-success",
    description: "Your order has been handed over.",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-destructive/10 text-destructive",
    description: "This order was cancelled.",
  },
  returned: {
    label: "Returned",
    badgeClass: "bg-destructive/10 text-destructive",
    description: "This order was returned to the shop.",
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; badgeClass: string }
> = {
  pending: { label: "Pending", badgeClass: "bg-warning/15 text-gold-deep" },
  paid: { label: "Paid", badgeClass: "bg-success/10 text-success" },
  failed: { label: "Failed", badgeClass: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", badgeClass: "bg-muted text-muted-foreground" },
};

/** Every status, in lifecycle order - for filter dropdowns. */
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "returned",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

/**
 * The forward path an order may take.
 *
 * Kept as DATA rather than a chain of if-statements, so refining the
 * workflow later is editing one table instead of hunting through
 * components. A shop that stops doing its own delivery just removes
 * "out-for-delivery" from two arrays.
 *
 * The rules encode real constraints:
 *   - nothing leaves a terminal state except delivered -> returned,
 *     because a delivered order is the only one that CAN come back
 *   - cancelling is available right up until the goods leave, and not
 *     after: once it is on a rider, the right move is a return
 *   - nothing ever moves backwards. An order that went out and came
 *     back is RETURNED, not PROCESSING again. Backwards moves would
 *     destroy the history of what actually happened.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["shipped", "out-for-delivery", "cancelled"],
  shipped: ["out-for-delivery", "delivered"],
  "out-for-delivery": ["delivered"],
  delivered: ["returned"],
  // Terminal. A cancelled order is not resurrected - a new order is
  // placed, so the record of the cancellation survives.
  cancelled: [],
  returned: [],
};

/**
 * May this order move from here to there?
 *
 * ONE function, called by the status dialog, the cancel dialog and
 * anything else that changes a status. A second implementation is how
 * "Delivered -> Pending" eventually slips through somewhere.
 */
export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Where this order can go next. Empty for terminal states. */
export function getAllowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

/**
 * The happy path, for the timeline.
 *
 * `cancelled` and `returned` are absent on purpose: they are exits from
 * the flow, not stages within it, and the timeline renders them as their
 * own state rather than as a step that never lights up.
 */
export const ORDER_TIMELINE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "out-for-delivery",
  "delivered",
];

/**
 * How far along the timeline an order is. -1 for cancelled/returned.
 *
 * DERIVED from `status` rather than stored, so the badge on the admin
 * table and the ticks on the customer's tracking page can never disagree
 * about where an order actually is.
 */
export function getOrderTimelineIndex(status: OrderStatus): number {
  return ORDER_TIMELINE_STATUSES.indexOf(status);
}

/** True for statuses an order cannot move on from. */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Coarse buckets for the dashboard summary cards.
 *
 * "Completed" deliberately means delivered only. An order that was
 * cancelled is finished but not completed, and counting it as such would
 * flatter the numbers.
 */
export function isPendingBucket(status: OrderStatus): boolean {
  return status === "pending";
}

export function isProcessingBucket(status: OrderStatus): boolean {
  return (
    status === "confirmed" ||
    status === "processing" ||
    status === "ready" ||
    status === "shipped" ||
    status === "out-for-delivery"
  );
}

export function isCompletedBucket(status: OrderStatus): boolean {
  return status === "delivered";
}
