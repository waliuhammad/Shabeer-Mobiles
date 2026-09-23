/**
 * Supplier domain types.
 *
 * SUPPLIER vs PURCHASE
 * --------------------
 * A SUPPLIER is a business you buy from - it persists for years.
 * A PURCHASE is one delivery from that supplier on one day.
 *
 *     Supplier "ABC Mobile Wholesale"
 *         |
 *         +-- PUR-0001   12 Aug, Rs 250,000
 *         +-- PUR-0007   03 Sep, Rs  98,000
 *         +-- PUR-0015   19 Sep, Rs 140,000
 *
 * One supplier, many purchases. Merging them would mean re-typing the
 * phone number on every delivery and having no way to ask "how much do
 * we owe ABC in total?" - which is the question that actually matters.
 */

/**
 * Whether the shop still buys from them.
 *
 * INACTIVE is not deletion. A supplier with purchase history can never
 * be removed, because those purchases explain where stock came from and
 * what it cost. Deleting the supplier would orphan every one of them.
 * Deactivating just hides them from the "new purchase" picker.
 */
export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  /** Internal id. Becomes a Firestore document id. */
  id: string;
  name: string;
  /** The person you actually speak to. */
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  status: SupplierStatus;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** What the add/edit form collects. No id, no timestamps. */
export interface SupplierFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  status: SupplierStatus;
}

/**
 * A supplier's financial position, DERIVED from their purchases.
 *
 * Never stored on the Supplier record. A stored balance is a number that
 * silently stops matching the purchases behind it the first time one is
 * edited; a derived one cannot.
 */
export interface SupplierTotals {
  /** How many purchases count toward the financial history. */
  purchaseCount: number;
  /** Sum of those purchase totals. */
  totalPurchased: number;
  totalPaid: number;
  /** What the shop still owes. This is the payable. */
  totalDue: number;
}
