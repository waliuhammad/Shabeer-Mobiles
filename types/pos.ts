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
   *
   * MEANINGLESS ON A CUSTOM LINE, which is why isCustom exists rather
   * than being inferred from stock === 0. A catalogue product genuinely
   * out of stock and an off-catalogue item that has no stock record at
   * all must not be treated the same: the first has to be refused, the
   * second has to be allowed.
   */
  stock: number;
  /**
   * An item the shop does not stock - bought in from another shop for
   * this customer. It has no product document, no stock to deduct and
   * no cost on file.
   */
  isCustom?: boolean;
  /**
   * What the shop paid for a CUSTOM item, typed by whoever bought it in.
   *
   * The comment above says this screen must never carry the shop's cost,
   * and that still holds: this is not a catalogue cost. Nothing about
   * the shop's own margins is revealed by it - it is one number, for one
   * item, entered by the person who just paid it.
   *
   * It has to be here because there is nowhere else to get it. A
   * catalogue line's cost is looked up server-side in a collection the
   * cashier cannot read; an off-catalogue line has no such record, and a
   * line that reached the books with cost 0 would report the whole sale
   * price as profit.
   */
  purchasePrice?: number;
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
  /**
   * Which owner actually served the customer.
   *
   * SEPARATE FROM cashierName, which stays the signed-in account. The
   * two owners share a login, so the account says who was signed in and
   * this says who made the sale - overwriting one with the other would
   * trade an audit trail for a business fact when both are wanted.
   *
   * Optional because invoices written before this existed have no
   * answer, and inventing one for them would be worse than showing none.
   */
  soldBy?: string;
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
  /**
   * Bought in for this sale rather than sold from stock.
   *
   * Stored explicitly rather than inferred from an empty productId, so
   * finance can say which figures on a bill were TYPED by a cashier and
   * which were looked up from the catalogue. That distinction matters:
   * for a catalogue line the price and the cost are both beyond the
   * till's reach, and for a custom line neither is.
   */
  isCustom?: boolean;
}
