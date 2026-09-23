/**
 * POS / billing domain types.
 *
 * FIVE ENTITIES THAT ARE EASY TO CONFUSE
 * --------------------------------------
 * They are related, they share fields, and they are NOT the same thing:
 *
 *   PRODUCT               What the shop sells. One row per item the shop
 *                         stocks. Lives forever, price changes over time.
 *
 *   POS CART ITEM         A line on the bill being typed RIGHT NOW.
 *                         Temporary, exists only in the cashier's screen,
 *                         and is thrown away on "New Bill".
 *
 *   INVOICE               The document handed to the customer. A frozen
 *                         record of what was sold at what price on what
 *                         day. Never changes again, even if the product's
 *                         price does tomorrow.
 *
 *   SALE                  The financial event behind the invoice - what
 *                         revenue reports and profit calculations read.
 *                         One sale may span several payments.
 *
 *   INVENTORY TRANSACTION The stock movement the sale caused: "3 units of
 *                         p-004 left the building because of INV-0007."
 *                         The audit trail that explains every change to a
 *                         stock number.
 *
 * Phase 1C Step 3 implements the first three, as mock data. SALE and
 * INVENTORY TRANSACTION arrive with the real backend, and they are the
 * two that must be created by trusted server code rather than a browser.
 */

/**
 * How the customer paid AT THE COUNTER.
 *
 * Named POSPaymentMethod because types/checkout.ts already owns
 * `PaymentMethod` for the online store, where the only options are
 * cash-on-delivery and pay-at-shop. Two different businesses, two
 * different sets of values - so two types, not one union trying to cover
 * both.
 */
export type POSPaymentMethod = "cash" | "card" | "bank-transfer" | "other";

/**
 * How much of THIS BILL has been settled at the counter.
 *
 * Named POSPaymentStatus because types/order.ts owns `PaymentStatus` for
 * online orders, where the question is different - has the money arrived
 * at all (pending / paid / failed / refunded). A counter bill can be
 * partially settled; an online payment cannot be "partially arrived".
 *
 * Derived from paid vs total - never stored as an independent field.
 */
export type POSPaymentStatus = "PAID" | "PARTIAL" | "DUE";

/**
 * WHO THE BILL IS FOR.
 *
 * REFACTORED IN STEP 7. This used to be a POSCustomer interface with
 * its own name/phone/address fields and a WALK_IN_CUSTOMER constant -
 * a second customer model that never met the online one.
 *
 * It is now just an id pointing at the ONE central customer directory
 * (types/customer.ts, data/customers.ts). That is what lets the admin
 * see a person's counter sales and website orders in a single history.
 *
 * The invoice keeps a NAME SNAPSHOT alongside the id, for the same
 * reason an order does: the id says who this is today, the snapshot
 * says what was printed on the receipt at the time.
 */

/**
 * One line on the bill in progress.
 *
 * A SNAPSHOT of the product, not a reference to it, for the same reason
 * the storefront cart takes one: the cashier must see a stable price while
 * they work.
 *
 * NOTE WHAT IS ABSENT: purchasePrice. The cashier's screen must never
 * carry the shop's cost - see lib/pos-utils.ts for why, and what happens
 * to cost instead.
 */
export interface POSCartItem {
  productId: string;
  name: string;
  sku: string;
  image: string | null;
  /** Selling price at the moment the line was added. */
  price: number;
  quantity: number;
  /**
   * Stock as the browser last saw it. Used to cap the quantity stepper.
   * NOT authoritative - see canFulfil() in lib/stock.ts.
   */
  stock: number;
}

/** Everything the bill summary needs, computed in one place. */
export interface POSTotals {
  /** Sum of price x quantity across all lines. */
  subtotal: number;
  /** Fixed-amount discount, already clamped to the subtotal. */
  discount: number;
  /** subtotal - discount. Never negative. */
  total: number;
  /** What the customer handed over. Never more than total. */
  paidAmount: number;
  /** total - paidAmount. Never negative. */
  dueAmount: number;
  paymentStatus: POSPaymentStatus;
  /** Total units on the bill, for the "3 items" line. */
  itemCount: number;
}

/**
 * A saved bill.
 *
 * Frozen. Every price here is what was actually charged, and stays that
 * way regardless of what the product costs next month. That is why the
 * line items are copied rather than referenced.
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  /** THE RELATIONSHIP - points at the central customer directory. */
  customerId: string;
  /** Snapshot of what was printed. See the note above. */
  customerName: string;
  customerPhone: string;
  items: InvoiceLine[];

  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;

  paymentMethod: POSPaymentMethod;
  paymentStatus: POSPaymentStatus;

  /** ISO 8601. Becomes a Firestore Timestamp later. */
  createdAt: string;
  /** Who rang it up. A placeholder until staff accounts exist. */
  cashierName: string;
}

export interface InvoiceLine {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  /** Price charged per unit. */
  price: number;
  /** price x quantity, stored rather than derived - an invoice is a
   *  historical document, and its arithmetic must not change if a
   *  rounding rule is edited later. */
  total: number;
  /**
   * COST per unit at the moment of sale. Added in Step 8 for COGS.
   *
   * Same reasoning as OrderItem.purchasePrice: an invoice is a frozen
   * historical document, so the cost it reports must be frozen too. If
   * this read data/product-costs.ts instead, yesterday's counter profit
   * would change the next time a supplier raised a price.
   *
   * SENSITIVE. The invoice PRINTOUT must never show it - the customer
   * is handed a receipt, not the shop's margins - and the cashier UI
   * must not either. Only admin finance pages read this field.
   */
  purchasePrice: number;
}
