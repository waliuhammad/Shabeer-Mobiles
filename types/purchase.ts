/**
 * Purchase domain types.
 *
 * A purchase is stock ARRIVING - the mirror image of a sale. Where a sale
 * takes units out and brings money in, a purchase brings units in and
 * takes money out.
 *
 *     SUPPLIER -> PURCHASE -> (received) -> INVENTORY TRANSACTION -> STOCK +
 */

/**
 * Where the delivery is.
 *
 *   DRAFT      Written up, goods NOT here yet. Affects nothing.
 *   RECEIVED   Goods counted in. THIS is what moves stock.
 *   CANCELLED  Never happened. Affects nothing.
 *
 * The distinction is the whole point of the status field. A purchase
 * existing is not stock existing - somebody has to physically receive
 * the boxes, and until they do, the shelves are empty no matter what the
 * paperwork says.
 */
export type PurchaseStatus = "DRAFT" | "RECEIVED" | "CANCELLED";

/**
 * Whether the SUPPLIER has been paid. Separate from PurchaseStatus, and
 * they move independently:
 *
 *   RECEIVED + DUE      goods are on the shelf, supplier unpaid - this is
 *                       the normal case, and it is a payable
 *   DRAFT    + PAID     paid up front, goods not yet delivered
 *   RECEIVED + PARTIAL  half settled
 *
 * One combined field could not express any of those.
 */
export type PurchasePaymentStatus = "PAID" | "PARTIAL" | "DUE";

/** How the supplier was paid. */
export type PurchasePaymentMethod = "cash" | "bank-transfer" | "other";

/**
 * One line of a purchase.
 *
 * `purchasePrice` is THE most important field in this file and the one
 * most easily got wrong.
 *
 * It is the cost paid to the supplier ON THIS DELIVERY, frozen forever.
 * It is NOT read from the product's current cost when displaying an old
 * purchase. If the shop paid Rs 30,000 in January and Rs 35,000 in
 * March, January's purchase must still say Rs 30,000 - otherwise every
 * historical document silently rewrites itself whenever a price moves,
 * and last quarter's cost of goods changes retroactively.
 *
 * data/product-costs.ts holds the CURRENT known cost, used to value
 * stock on hand. These two are different numbers answering different
 * questions and must never be conflated.
 */
export interface PurchaseItem {
  productId: string;
  /** Snapshot, so history reads correctly after a product is renamed. */
  name: string;
  sku: string;
  quantity: number;
  /** Cost per unit on THIS purchase. Frozen. */
  purchasePrice: number;
  /** quantity x purchasePrice, stored rather than derived - a historical
   *  document's arithmetic must not shift if a rounding rule changes. */
  total: number;
}

export interface Purchase {
  /**
   * Internal id, distinct from the human-facing number - the same
   * separation Order draws. Firestore will supply this.
   */
  id: string;
  /** "PUR-0001". What appears on paperwork and gets quoted on the phone. */
  purchaseNumber: string;

  /** The relationship. One supplier, many purchases. */
  supplierId: string;
  /** Snapshot, so a purchase stays readable if the supplier is renamed. */
  supplierName: string;

  items: PurchaseItem[];

  /* ---- Money. Stored as agreed, never recomputed from current costs. -- */
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  /** total - paidAmount. This is the supplier payable. */
  dueAmount: number;

  paymentMethod: PurchasePaymentMethod;
  paymentStatus: PurchasePaymentStatus;
  status: PurchaseStatus;

  notes: string;

  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
  /** Set only when the goods were actually counted in. */
  receivedAt?: string;

  /**
   * Ids of the inventory transactions this purchase produced.
   *
   * Empty until received. Non-empty is the proof that stock was moved,
   * and it is what makes receiving twice detectable - see
   * lib/purchase-utils.ts.
   */
  inventoryTransactionIds: string[];
}

/** A line being edited on the new-purchase screen. */
export interface PurchaseDraftItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
}

/** Everything the purchase summary panel needs, computed in one place. */
export interface PurchaseTotals {
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PurchasePaymentStatus;
  /** Total units across all lines. */
  unitCount: number;
}
