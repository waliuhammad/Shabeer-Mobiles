/**
 * THE central Customer model.
 *
 * Before this file there were three competing shapes:
 *   - POSCustomer      (types/pos.ts)     for counter sales
 *   - DemoCustomer     (data/customer.ts) for the storefront account
 *   - flat name/phone/email fields on Order
 *
 * They are now one. A person who buys a charger at the counter on Monday
 * and orders a phone on the website on Friday is ONE customer with two
 * transactions - not two records that never meet.
 *
 * FOUR DOORS, ONE RECORD
 * ----------------------
 *   website registration  ->
 *   online checkout       ->  Customer  <-  POS walk-in
 *   admin "Add Customer"  ->
 *
 * CUSTOMER vs ORDER vs INVOICE vs SALE vs PAYMENT
 * -----------------------------------------------
 *   CUSTOMER   The person. Persists for years across many purchases.
 *   ORDER      A request to buy, placed on the website. May be cancelled.
 *   INVOICE    The document handed over - a counter bill, or an order's
 *              receipt. Frozen at the moment it is issued.
 *   SALE       The financial event the business books as revenue.
 *   PAYMENT    Money actually moving. One sale can take several.
 *
 * A customer HAS many orders and invoices; an order or invoice belongs
 * to exactly one customer.
 */

/**
 * Whether the shop still deals with them.
 *
 * INACTIVE is not deletion, and deletion is not offered anywhere. A
 * customer with orders behind them can never be removed: those orders
 * record who bought what, and deleting the customer would orphan every
 * one of them. Inactive just hides them from the POS picker.
 */
export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface Customer {
  /**
   * Internal id: "cus_001".
   *
   * DELIBERATELY unlike an order number (SM-1001) or an invoice number
   * (SM-INV-0001). Those are documents; this is a person. Reusing one
   * numbering scheme for both is how you end up unable to tell whether
   * "1001" means a customer or a purchase.
   */
  id: string;
  name: string;
  /** The field a cashier actually searches by. */
  phone: string;
  email: string;
  address: string;
  city: string;
  /** Shop-only. Never shown to the customer. */
  notes: string;
  status: CustomerStatus;
  /** ISO 8601. Becomes a Firestore Timestamp later. */
  createdAt: string;
  updatedAt: string;
}

/** What the add/edit form collects. No id, no timestamps. */
export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  status: CustomerStatus;
}

/**
 * A customer's trading history, DERIVED from their orders and invoices.
 *
 * Never stored on the Customer record. A stored "totalSpent" stops
 * matching the transactions behind it the first time one changes, and a
 * number nobody can verify is worse than no number.
 *
 * NOTE WHAT IS ABSENT: cost, margin, profit. A customer screen shows
 * what the customer paid. What the shop made on them is finance data
 * that belongs behind a different role - see data/product-costs.ts.
 */
export interface CustomerStats {
  /** Online orders placed, excluding cancelled ones. */
  orderCount: number;
  /** Counter invoices raised. */
  posSaleCount: number;
  /** orderCount + posSaleCount. */
  totalTransactions: number;
  /**
   * Sum of HISTORICAL transaction totals - what was actually charged at
   * the time. Never recomputed from current product prices.
   */
  totalSpent: number;
  /** ISO of the most recent transaction, or null. */
  lastPurchaseAt: string | null;
  /** Two or more completed purchases. Derived, never a stored flag. */
  isRepeat: boolean;
}

/**
 * One row of the unified purchase history on the customer detail page.
 *
 * Online orders and counter sales are different entities with different
 * shapes; this is the small common view that lets them share one table.
 */
export interface CustomerTransaction {
  /** "SM-1001" or "INV-1245". */
  reference: string;
  kind: "ONLINE_ORDER" | "POS_SALE";
  /** ISO 8601. */
  at: string;
  /** Units, where known. */
  itemCount: number;
  total: number;
  /** Human label, e.g. "Delivered" or "Paid". */
  statusLabel: string;
  statusClass: string;
  paymentLabel: string;
  paymentClass: string;
  /** Where "View" goes. null when the record has no detail page. */
  href: string | null;
}

/**
 * The stable walk-in record.
 *
 * ONE record, reused for every anonymous counter sale - NOT a new
 * customer row each time somebody buys a screen protector. Without it
 * the customer list would fill with hundreds of empty "Walk-in" entries
 * within a month and become useless for finding an actual person.
 *
 * The moment a cashier types a real name and phone, a real customer is
 * created instead and this is not used.
 */
export const WALK_IN_CUSTOMER_ID = "cus_walkin";
