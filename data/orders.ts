import type { Order, OrderActivity, OrderStatus, PaymentStatus } from "@/types";
import type { PaymentMethod } from "@/types";

/**
 * THE shared mock order dataset.
 *
 * ONE source, read by all three surfaces:
 *
 *     data/orders.ts
 *          |
 *          +--> /admin/orders          (shop manages them)
 *          +--> /account               (customer sees their history)
 *          +--> /tracking              (customer follows one)
 *
 * There is deliberately no mock-admin-orders / mock-customer-orders /
 * mock-tracking-orders. Three copies would disagree the first time one
 * was edited, and then the shop and the customer would be looking at
 * different versions of the same purchase.
 *
 * ORDER NUMBER FORMAT: "SM-1001", not "SM-ORD-1001".
 * The brief suggested the longer form, but this format is already in
 * use across the checkout confirmation, the tracking page's own help
 * text, the account order list, and - importantly - as `referenceId` on
 * SALE_ONLINE rows in the inventory ledger (data/mock-inventory.ts).
 * Renaming would break every saved /tracking?order=SM-1001 link and
 * orphan those ledger references, which is exactly the history-rewriting
 * this project keeps trying to avoid. The format is consistent; it is
 * just shorter.
 *
 * PHASE 2: this file is deleted. Orders become the Firestore collection
 * `orders/{orderId}` - where the document id and the orderNumber are
 * finally two different things.
 */

/** Fixed clock so the demo dataset is stable across reloads. */
const NOW = new Date("2026-09-23T10:00:00.000Z").getTime();
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3600_000).toISOString();

interface SeedOrder {
  orderNumber: string;
  /** Links to the central customer record in data/customers.ts. */
  customerId: string;
  hoursAgo: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  internalNote: string;
  items: {
    productId: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    quantity: number;
    /** Cost per unit WHEN THIS ORDER WAS PLACED - see types/order.ts. */
    purchasePrice: number;
  }[];
  discount: number;
  delivery: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  activity: OrderActivity[];
}

/**
 * Seven orders spanning every state the UI must render.
 *
 * Names and numbers are obviously fictional demo data. Phone numbers use
 * the 03xx format Pakistani mobiles actually take, so the search-by-phone
 * filter is exercised realistically.
 */
const SEED: SeedOrder[] = [
  // Cleared. Real records are entered through the admin panel.
];

/**
 * Totals are COMPUTED from the seeded lines, not typed by hand.
 *
 * Hand-typed totals drift from the items they claim to sum, which is the
 * exact bug an order system must never have. Note this runs once, at
 * module load, to BUILD the frozen figures - the app never recomputes an
 * existing order's total from current product prices.
 */
function buildOrders(): Order[] {
  return SEED.map((seed) => {
    const subtotal = seed.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = Math.max(0, subtotal - seed.discount) + seed.delivery;
    const lastActivity = seed.activity.at(-1);

    return {
      orderNumber: seed.orderNumber,
      placedAt: at(seed.hoursAgo),
      updatedAt: lastActivity?.at ?? at(seed.hoursAgo),
      /**
       * THE RELATIONSHIP. Points at data/customers.ts.
       *
       * The snapshot fields below it are NOT redundant: customerId says
       * who this is TODAY, the snapshot says what they told us AT THE
       * TIME. If the customer later changes their phone number, this
       * order must still show the number the rider was given.
       */
      customerId: seed.customerId,
      customerName: seed.customerName,
      phone: seed.phone,
      email: seed.email,
      address: seed.address,
      city: seed.city,
      postalCode: seed.postalCode,
      notes: seed.notes,
      internalNote: seed.internalNote,
      items: seed.items.map((i) => ({ ...i, image: null })),
      subtotal,
      discount: seed.discount,
      delivery: seed.delivery,
      total,
      paymentMethod: seed.paymentMethod,
      paymentStatus: seed.paymentStatus,
      status: seed.status,
      activity: seed.activity,
    };
  });
}

export const demoOrders: Order[] = buildOrders();

/**
 * Phase 2: query(collection(db, "orders"), where("orderNumber", "==", n))
 * Same name, same return type - so callers never change.
 */
export function getDemoOrder(orderNumber: string): Order | undefined {
  return demoOrders.find(
    (order) => order.orderNumber.toLowerCase() === orderNumber.toLowerCase()
  );
}
