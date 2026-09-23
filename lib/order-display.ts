import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from "@/types";

/**
 * Order list filtering and labels.
 *
 * Kept out of the page component so the filter rules are testable and so
 * /admin/orders/page.tsx stays a composition, not a pile of predicates.
 */

/**
 * Online payment methods.
 *
 * Note this is the CHECKOUT PaymentMethod (cash-on-delivery |
 * pay-at-shop), not the POS one. The storefront offers no card or bank
 * transfer yet, so those values do not exist in the type - adding
 * unreachable options to a filter is how a shop owner ends up wondering
 * why "Card" always returns nothing. They arrive with the payment
 * gateway, and the union in types/checkout.ts gains them then.
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  "cash-on-delivery": "Cash on Delivery",
  "pay-at-shop": "Pay at Shop",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash-on-delivery",
  "pay-at-shop",
];

/** The date ranges the filter offers. */
export type OrderDateRange = "all" | "today" | "7d" | "30d";

export const DATE_RANGE_LABELS: Record<OrderDateRange, string> = {
  all: "All Time",
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

export interface OrderFilterState {
  query: string;
  status: OrderStatus | "all";
  paymentStatus: PaymentStatus | "all";
  paymentMethod: PaymentMethod | "all";
  dateRange: OrderDateRange;
}

export const EMPTY_ORDER_FILTERS: OrderFilterState = {
  query: "",
  status: "all",
  paymentStatus: "all",
  paymentMethod: "all",
  dateRange: "all",
};

/**
 * Is this order inside the chosen window?
 *
 * "Today" compares calendar days rather than "within 24 hours" - a shop
 * owner asking for today's orders means since midnight, not since this
 * time yesterday.
 */
function matchesDateRange(order: Order, range: OrderDateRange): boolean {
  if (range === "all") return true;

  const placed = new Date(order.placedAt);
  const now = new Date();

  if (range === "today") {
    return placed.toDateString() === now.toDateString();
  }

  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return placed >= cutoff;
}

/**
 * All five filters apply TOGETHER - they narrow, never replace. Searching
 * "Ali" with status Delivered returns only Ali's delivered orders.
 */
export function filterOrders(
  orders: Order[],
  filters: OrderFilterState
): Order[] {
  const q = filters.query.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) return false;
    if (
      filters.paymentStatus !== "all" &&
      order.paymentStatus !== filters.paymentStatus
    ) {
      return false;
    }
    if (
      filters.paymentMethod !== "all" &&
      order.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }
    if (!matchesDateRange(order, filters.dateRange)) return false;

    if (!q) return true;

    // Phone is matched with spaces stripped, so "03001234567" finds
    // "0300 1234567" - people type it both ways.
    const phoneDigits = order.phone.replace(/\s/g, "").toLowerCase();

    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.phone.toLowerCase().includes(q) ||
      phoneDigits.includes(q.replace(/\s/g, ""))
    );
  });
}

/** True when anything is narrowing the list. */
export function hasActiveOrderFilters(filters: OrderFilterState): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.dateRange !== "all"
  );
}

/** "23 Sep 2026, 14:30" - fixed locale so server and client agree. */
export function formatOrderDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
