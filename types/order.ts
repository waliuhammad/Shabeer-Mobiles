import type { PaymentMethod } from "./checkout";

/**
 * THE central Order type.
 *
 * ONE model, four consumers: customer checkout, customer account,
 * customer order tracking, and admin order management. There is no
 * OnlineOrder / CustomerOrder / AdminOrder - they would drift within a
 * week and then the customer and the shop would be looking at different
 * versions of the same purchase.
 *
 * ORDER vs SALE vs INVOICE vs INVENTORY TRANSACTION
 * -------------------------------------------------
 * Related, routinely confused, and genuinely different things:
 *
 *   ORDER      A customer's REQUEST to buy. It exists the moment they
 *              press Place Order, and it may never become anything else -
 *              they can cancel, or the shop can reject it.
 *
 *   SALE       The business ACCEPTING that request as revenue. This is
 *              what profit reports read. An order becomes a sale at a
 *              point the business decides (on confirmation, on dispatch,
 *              or on delivery) - not automatically on creation.
 *
 *   INVOICE    The DOCUMENT handed over. A frozen record of what was
 *              charged. The POS already has one (types/pos.ts).
 *
 *   INVENTORY  The STOCK MOVEMENT a sale caused. "2 units of p-004 left
 *   TRANSACTION the building because of order SM-1004."
 *
 * An order sitting at PENDING is none of the other three yet. That is
 * why creating an order does NOT touch stock - see the note at the
 * bottom of lib/order-utils.ts.
 */

/**
 * Where the order is in its journey.
 *
 * Extended in Phase 1C Step 5 with `processing`, `ready` and `returned`.
 * `out-for-delivery` predates that and is kept deliberately: the customer
 * tracking timeline already uses it, and for a shop doing its own local
 * delivery "the rider is on the way" is genuinely different from
 * "shipped". READY means ready to collect or dispatch.
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned";

/**
 * Whether the money has arrived. DELIBERATELY SEPARATE from OrderStatus.
 *
 * They answer different questions and move independently:
 *
 *   status PROCESSING + payment PENDING   cash on delivery, being packed
 *   status DELIVERED  + payment PENDING   handed over, rider still owes
 *                                          the cash to the shop
 *   status DELIVERED  + payment PAID      the normal end state
 *   status RETURNED   + payment REFUNDED  came back, money returned
 *
 * Merging them into one field makes the second and fourth rows
 * impossible to express, and those are exactly the ones a shop owner
 * needs to see.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/**
 * One line of an order.
 *
 * A SNAPSHOT, not a reference. If the iPhone 12 sold for Rs 28,999 in
 * September, this order says Rs 28,999 forever - even after the shop
 * reprices it. Recomputing an old order's total from today's product
 * record would silently rewrite history and make last month's revenue
 * figure change every time someone edits a price.
 */
export interface OrderItem {
  /** Links back to the product. The only field a server would trust. */
  productId: string;
  name: string;
  slug: string;
  /** The counter code, matching Product.sku. Shown on the admin table. */
  sku: string;
  image: string | null;
  /** Price charged per unit, frozen at the time of ordering. */
  price: number;
  quantity: number;
  /**
   * COST per unit, frozen at the time of ordering. Added in Step 8.
   *
   * WHY THIS HAS TO BE STORED, not looked up
   * ----------------------------------------
   * COGS for an old sale must reflect what that stock actually cost the
   * shop THEN. If a phone cost Rs 40,000 in August and Rs 45,000 today,
   * an August sale at Rs 50,000 made Rs 10,000 - and it still made
   * Rs 10,000 after today's price rise. Reading the current cost instead
   * would silently rewrite August's profit to Rs 5,000 every time a
   * supplier changed their price, so last month's reported profit would
   * never stay still.
   *
   * data/product-costs.ts holds the CURRENT cost and is used to value
   * stock still on the shelf. It must never be used for a past sale.
   *
   * SENSITIVE: this is a purchase price. It is admin-only and must not
   * reach any cashier-facing screen - see the note on the Order type.
   */
  purchasePrice: number;
}

/**
 * One entry in an order's history.
 *
 * Same idea as the inventory ledger: the status field says WHERE an
 * order is, the activity list says HOW it got there and when. Without
 * it, "why was this cancelled three days after delivery?" has no answer.
 */
export interface OrderActivity {
  id: string;
  /** ISO 8601. Becomes a Firestore Timestamp later. */
  at: string;
  /** Human sentence: "Order moved from Processing to Ready." */
  message: string;
  /** Generic role until staff accounts exist: Admin / Cashier / System. */
  by: string;
}

export interface Order {
  /**
   * Human-facing reference: "SM-1004".
   *
   * NOT the same thing as an internal id. Firestore will give each order
   * a document id (a random string) and THIS stays the number printed on
   * receipts and quoted on the phone. In this mock phase the number also
   * serves as the key, because there is no database issuing ids.
   */
  orderNumber: string;

  /** ISO 8601. When the customer placed it. */
  placedAt: string;
  /** ISO 8601. Last time anything changed. Drives "Last Updated". */
  updatedAt: string;

  /* ---- Customer. A snapshot, plus a future reference. ---- */
  /**
   * Links to a customers collection once one exists. null for a guest
   * checkout, which is most of them. The snapshot below is what the
   * admin screens actually display, so an order stays readable even if
   * the customer record is later deleted.
   */
  customerId: string | null;
  customerName: string;
  phone: string;
  email: string;

  /* ---- Where it is going ---- */
  address: string;
  city: string;
  postalCode: string;

  /** What the CUSTOMER wrote at checkout. Visible to them. */
  notes: string;
  /**
   * Shop-only. Never shown to the customer, in this phase or later -
   * "customer was rude on the phone" must not appear in their account.
   */
  internalNote: string;

  items: OrderItem[];

  /* ---- Money, as charged. Never recomputed from current prices. ---- */
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;

  /**
   * SECURITY NOTE - UPDATED IN STEP 8.
   *
   * OrderItem.purchasePrice now DOES exist, because profit reporting is
   * impossible without a cost-at-sale snapshot. That makes an Order a
   * mixed document: most of it is the customer's, one field is the
   * shop's.
   *
   * So an order must be stripped before it crosses into anything the
   * customer can see. Use toCustomerOrder() from lib/order-utils.ts on
   * every storefront route. The admin keeps the full object.
   *
   * Hiding the field in the UI is NOT the security boundary. In Phase 2
   * the split is enforced for real: Firestore Security Rules let a
   * signed-in shopper read their own order, and the cost lives either in
   * a subcollection they cannot read or is stripped by a Cloud Function
   * before the document is ever sent. Until then this sanitiser is a
   * convention the code follows, not a guarantee the browser enforces.
   */

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;

  /** Newest last. */
  activity: OrderActivity[];
}

/** One row of the customer-facing tracking timeline. */
export interface TrackingStep {
  status: OrderStatus;
  label: string;
  description: string;
}
