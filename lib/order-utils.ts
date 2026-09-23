import { demoOrders, getDemoOrder } from "@/data/orders";
import { getProductCost } from "@/data/product-costs";
import {
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  ORDER_TIMELINE_STATUSES,
  getOrderTimelineIndex,
} from "@/lib/order-status";
import type {
  CartItem,
  CartTotals,
  CheckoutFormData,
  Order,
  OrderStatus,
  PaymentMethod,
  TrackingStep,
} from "@/types";

const STORAGE_KEY = "shabbir-mobiles:orders:v1";

/**
 * The tracking timeline, in order.
 *
 * "cancelled" is deliberately NOT here - it is not a stage on the way to
 * delivery, it is an exit from the flow, and the tracking page renders it
 * as its own state.
 */
/**
 * The customer-facing timeline, built FROM the shared status config.
 *
 * Previously this file hard-coded its own labels and descriptions, which
 * meant the tracking page and the admin table each had their own idea of
 * what "Confirmed" says. Now both read lib/order-status.ts.
 */
export const TRACKING_STEPS: TrackingStep[] = ORDER_TIMELINE_STATUSES.map(
  (status) => ({
    status,
    label: ORDER_STATUS_CONFIG[status].label,
    description: ORDER_STATUS_CONFIG[status].description,
  })
);

/**
 * How far along the timeline an order is. Re-exported from
 * lib/order-status.ts so existing callers keep working.
 */
export function getStatusIndex(status: OrderStatus): number {
  return getOrderTimelineIndex(status);
}

/** Human label for a status. Delegates to the shared config. */
export const STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s, ORDER_STATUS_CONFIG[s].label])
) as Record<OrderStatus, string>;

/** e.g. "22 Sep 2026". Fixed locale so server and client agree exactly -
 *  letting it default would risk a hydration mismatch when the visitor's
 *  locale differs from the server's. */
export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Total units in an order. iPhone x1 + Cable x2 = 3 items. */
export function countOrderItems(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

/* ==================================================================
   LOCAL ORDER STORAGE

   Orders placed during this demo are kept in localStorage so that the
   confirmation screen's "Track Order" button actually finds something.
   Without it the flow would dead-end: you would place an order, get a
   number, and tracking would say it does not exist.

   THIS IS NOT A DATABASE. It lives in one browser, the customer can edit
   it freely, and the shop cannot see it. It exists purely so the frontend
   flow is testable end to end before Firebase arrives.
   ================================================================== */

function readStoredOrders(): Order[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Order =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Order).orderNumber === "string" &&
        Array.isArray((entry as Order).items)
    );
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readStoredOrders();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([order, ...existing].slice(0, 20))
    );
  } catch {
    // Storage blocked or full. The confirmation screen still works for
    // this session; only later tracking would miss the order.
  }
}

/**
 * Every order this browser knows about: demo orders plus anything placed
 * in this session, newest first.
 */
export function getAllOrders(): Order[] {
  return [...readStoredOrders(), ...demoOrders].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
  );
}

/**
 * Find one order by its number, from either source.
 *
 * Phase 2 replaces the body with a Firestore query AND a Security Rule
 * restricting reads to the order's own customer. Right now anyone who
 * guesses "SM-1001" can see it - fine for demo data, unacceptable for real
 * customer addresses and phone numbers.
 */
export function findOrder(orderNumber: string): Order | undefined {
  const cleaned = orderNumber.trim();
  if (!cleaned) return undefined;

  const stored = readStoredOrders().find(
    (order) => order.orderNumber.toLowerCase() === cleaned.toLowerCase()
  );

  return stored ?? getDemoOrder(cleaned);
}

/**
 * Next order reference, continuing from the highest number seen.
 *
 * A REAL order number must NEVER be generated in the browser. Two
 * customers checking out in the same second would produce the same one,
 * and nothing stops a customer inventing their own. The real number will
 * come from the server when the order document is created - most likely
 * from a Firestore counter updated inside the same transaction that writes
 * the order.
 */
export function generateOrderNumber(): string {
  const numbers = getAllOrders()
    .map((order) => Number.parseInt(order.orderNumber.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));

  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
  return `SM-${next}`;
}

/**
 * Builds the mock Order from what checkout collected.
 *
 * Note the shape of the arguments: the form, the cart lines and the
 * totals. In Phase 2 ONLY the form plus [{productId, quantity}] crosses
 * the wire, and a Cloud Function produces everything else. Keeping that
 * construction in one function means there is exactly one place to change.
 */
export function buildMockOrder(
  form: CheckoutFormData,
  items: CartItem[],
  totals: CartTotals,
  paymentMethod: PaymentMethod
): Order {
  const placedAt = new Date().toISOString();

  return {
    orderNumber: generateOrderNumber(),
    placedAt,
    updatedAt: placedAt,
    // Guest checkout - the storefront has no accounts yet.
    customerId: null,
    customerName: form.fullName,
    phone: form.phone,
    email: form.email,
    address: form.address,
    city: form.city,
    postalCode: form.postalCode,
    notes: form.notes,
    internalNote: "",
    items: items.map((item) => ({
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      // The cart snapshot predates SKUs on cart lines; an empty string
      // keeps the type honest rather than pretending we know it.
      sku: "",
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      /**
       * Cost frozen at checkout, for COGS. See types/order.ts.
       *
       * PHASE 2: this must NOT be built in the browser. A shopper who
       * can post their own purchasePrice can make every sale look like
       * a loss, or a triumph. A Cloud Function looks the cost up
       * server-side when it writes the order; this line exists only
       * because the whole order is currently mocked client-side.
       */
      purchasePrice: getProductCost(item.productId),
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    delivery: totals.delivery,
    total: totals.total,
    paymentMethod,
    // Nothing has been collected yet. Cash on delivery and pay-at-shop
    // both settle later, which is exactly why payment status is its own
    // field rather than part of the order status.
    paymentStatus: "pending",
    // Every new order starts here. Only the shop moves it forward, which
    // is why status will be writable by staff and read-only to customers.
    status: "pending",
    activity: [
      {
        id: `act-${Date.now()}`,
        at: placedAt,
        message: "Order placed by customer.",
        by: "System",
      },
    ],
  };
}

/* ==================================================================
   THE STOREFRONT BOUNDARY
   ================================================================== */

/**
 * Strip the shop's cost off an order before a customer can see it.
 *
 * OrderItem.purchasePrice was added in Step 8 so profit could be
 * reported. That makes an Order a mixed document: the customer owns
 * most of it, the shop owns that one field. Anything rendered on
 * /account, /tracking or the checkout confirmation must go through
 * here first.
 *
 * purchasePrice is set to 0 rather than deleted, because OrderItem
 * requires it - a customer-facing order stays the same SHAPE, it just
 * stops carrying the number. Widening the type to make the field
 * optional would mean every finance call site had to start checking
 * for undefined, and the one place that must never see a zero is the
 * finance layer, which reads the unsanitised order.
 *
 * THIS IS A CONVENTION, NOT A SECURITY BOUNDARY. Nothing stops a future
 * component importing demoOrders directly. In Phase 2 the split becomes
 * real: Firestore Security Rules let a shopper read only their own
 * order, and the cost either lives in a subcollection they cannot read
 * or is stripped by a Cloud Function before the document is sent.
 */
export function toCustomerOrder(order: Order): Order {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, purchasePrice: 0 })),
    // Internal notes are the shop talking to itself about the customer.
    internalNote: "",
  };
}

/** The list form of toCustomerOrder. */
export function toCustomerOrders(orders: Order[]): Order[] {
  return orders.map(toCustomerOrder);
}
