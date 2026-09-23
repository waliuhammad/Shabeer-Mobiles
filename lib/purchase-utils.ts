import type {
  Purchase,
  PurchaseDraftItem,
  PurchasePaymentMethod,
  PurchasePaymentStatus,
  PurchaseStatus,
  PurchaseTotals,
  Supplier,
  SupplierTotals,
} from "@/types";

/* ==================================================================
   DISPLAY
   ================================================================== */

export const PURCHASE_STATUS_CONFIG: Record<
  PurchaseStatus,
  { label: string; badgeClass: string; inventoryNote: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-muted text-muted-foreground",
    inventoryNote: "Inventory has not been updated. The goods are not here yet.",
  },
  RECEIVED: {
    label: "Received",
    badgeClass: "bg-success/10 text-success",
    inventoryNote: "Inventory received. Stock was increased for every line.",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-destructive/10 text-destructive",
    inventoryNote: "Cancelled - no inventory was added.",
  },
};

export const PURCHASE_PAYMENT_STATUS_CONFIG: Record<
  PurchasePaymentStatus,
  { label: string; badgeClass: string }
> = {
  PAID: { label: "Paid", badgeClass: "bg-success/10 text-success" },
  PARTIAL: { label: "Partial", badgeClass: "bg-warning/15 text-gold-deep" },
  DUE: { label: "Due", badgeClass: "bg-destructive/10 text-destructive" },
};

export const PURCHASE_PAYMENT_METHOD_LABELS: Record<
  PurchasePaymentMethod,
  string
> = {
  cash: "Cash",
  "bank-transfer": "Bank Transfer",
  other: "Other",
};

export const PURCHASE_STATUSES: PurchaseStatus[] = [
  "DRAFT",
  "RECEIVED",
  "CANCELLED",
];

export const PURCHASE_PAYMENT_STATUSES: PurchasePaymentStatus[] = [
  "PAID",
  "PARTIAL",
  "DUE",
];

export const PURCHASE_PAYMENT_METHODS: PurchasePaymentMethod[] = [
  "cash",
  "bank-transfer",
  "other",
];

/* ==================================================================
   STATUS TRANSITIONS

   Deliberately narrow, and the narrowness is the safety feature.
   ================================================================== */

/**
 * A DRAFT can become either. Nothing leaves RECEIVED or CANCELLED.
 *
 * RECEIVED is terminal because stock has already moved. "Cancelling" it
 * would leave the units on the shelf with no document explaining them -
 * the paperwork would say the delivery never happened while the shelf
 * says otherwise. Correcting a received purchase needs a purchase RETURN
 * that removes the stock with its own ledger entry, which is a later
 * feature. Silently flipping a status is not a correction, it is a lie.
 */
export const PURCHASE_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  DRAFT: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

export function canTransitionPurchaseStatus(
  from: PurchaseStatus,
  to: PurchaseStatus
): boolean {
  if (from === to) return false;
  return PURCHASE_TRANSITIONS[from].includes(to);
}

/**
 * Can this purchase be received right now?
 *
 * TWO checks, and the second is the one that matters. A purchase already
 * carrying inventory transaction ids has moved stock once - receiving it
 * again would add the same units a second time and quietly inflate
 * inventory. Checking the ids rather than only the status means a
 * corrupted record (RECEIVED lost, ids kept) still cannot double-count.
 */
export function canReceivePurchase(purchase: Purchase): boolean {
  return (
    purchase.status === "DRAFT" && purchase.inventoryTransactionIds.length === 0
  );
}

export function canCancelPurchase(purchase: Purchase): boolean {
  return purchase.status === "DRAFT";
}

/* ==================================================================
   MONEY

   Same shape as the POS bill maths: everything derives from the lines,
   the discount and the paid amount. Nothing is stored twice.
   ================================================================== */

export function calculatePurchaseTotals(
  items: Pick<PurchaseDraftItem, "quantity" | "purchasePrice">[],
  requestedDiscount: number,
  requestedPaid: number
): PurchaseTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.purchasePrice,
    0
  );

  // Clamped at both ends: a negative discount is a secret surcharge, and
  // one bigger than the subtotal would make the supplier owe the shop.
  const discount =
    Number.isFinite(requestedDiscount) && requestedDiscount > 0
      ? Math.min(requestedDiscount, subtotal)
      : 0;

  const total = Math.max(0, subtotal - discount);

  // Paying more than the bill is a data-entry error, not an overpayment
  // to bank. It is clamped here and flagged in the UI.
  const paidAmount = Math.min(Math.max(0, requestedPaid), total);

  return {
    subtotal,
    discount,
    total,
    paidAmount,
    dueAmount: Math.max(0, total - paidAmount),
    paymentStatus: derivePurchasePaymentStatus(total, paidAmount),
    unitCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * DERIVED, never a field someone sets by hand. Change the paid amount
 * and the badge follows - they cannot drift apart.
 */
export function derivePurchasePaymentStatus(
  total: number,
  paidAmount: number
): PurchasePaymentStatus {
  if (total > 0 && paidAmount >= total) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "DUE";
}

/* ==================================================================
   SUPPLIER PAYABLES

   WHICH PURCHASES COUNT, and why.

   Only RECEIVED ones. A DRAFT is a plan - the goods are not here and
   nothing is owed for them yet. A CANCELLED one never happened. Counting
   either would show the shop owing money it does not owe, and a payables
   figure nobody trusts is worse than none.
   ================================================================== */

/** The one rule, so every screen agrees on what counts. */
export function countsTowardPayables(purchase: Purchase): boolean {
  return purchase.status === "RECEIVED";
}

export function calculateSupplierTotals(
  purchases: Purchase[],
  supplierId: string
): SupplierTotals {
  const relevant = purchases.filter(
    (p) => p.supplierId === supplierId && countsTowardPayables(p)
  );

  return {
    purchaseCount: relevant.length,
    totalPurchased: relevant.reduce((sum, p) => sum + p.total, 0),
    totalPaid: relevant.reduce((sum, p) => sum + p.paidAmount, 0),
    totalDue: relevant.reduce((sum, p) => sum + p.dueAmount, 0),
  };
}

/* ==================================================================
   PURCHASE NUMBERS
   ================================================================== */

export function formatPurchaseNumber(sequence: number): string {
  return `PUR-${String(sequence).padStart(4, "0")}`;
}

/**
 * Next number, continuing from the highest seen.
 *
 * Mock only. A real purchase number must come from the server inside the
 * write transaction - two people creating a purchase in the same second
 * would otherwise produce the same one.
 */
export function nextPurchaseNumber(purchases: Purchase[]): string {
  const numbers = purchases
    .map((p) => Number.parseInt(p.purchaseNumber.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  return formatPurchaseNumber((numbers.length ? Math.max(...numbers) : 0) + 1);
}

/* ==================================================================
   FILTERING
   ================================================================== */

export type PurchaseDateRange = "all" | "today" | "7d" | "30d";

export const PURCHASE_DATE_LABELS: Record<PurchaseDateRange, string> = {
  all: "All Time",
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

export interface PurchaseFilterState {
  query: string;
  status: PurchaseStatus | "all";
  paymentStatus: PurchasePaymentStatus | "all";
  supplierId: string | "all";
  dateRange: PurchaseDateRange;
}

export const EMPTY_PURCHASE_FILTERS: PurchaseFilterState = {
  query: "",
  status: "all",
  paymentStatus: "all",
  supplierId: "all",
  dateRange: "all",
};

function inDateRange(iso: string, range: PurchaseDateRange): boolean {
  if (range === "all") return true;
  const when = new Date(iso);
  const now = new Date();
  if (range === "today") return when.toDateString() === now.toDateString();
  const days = range === "7d" ? 7 : 30;
  return when >= new Date(now.getTime() - days * 86_400_000);
}

/** All five filters narrow together - they never replace one another. */
export function filterPurchases(
  purchases: Purchase[],
  filters: PurchaseFilterState
): Purchase[] {
  const q = filters.query.trim().toLowerCase();

  return purchases.filter((p) => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (
      filters.paymentStatus !== "all" &&
      p.paymentStatus !== filters.paymentStatus
    ) {
      return false;
    }
    if (filters.supplierId !== "all" && p.supplierId !== filters.supplierId) {
      return false;
    }
    if (!inDateRange(p.createdAt, filters.dateRange)) return false;
    if (!q) return true;

    return (
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q)
    );
  });
}

export function hasActivePurchaseFilters(f: PurchaseFilterState): boolean {
  return (
    f.query.trim() !== "" ||
    f.status !== "all" ||
    f.paymentStatus !== "all" ||
    f.supplierId !== "all" ||
    f.dateRange !== "all"
  );
}

/** Purchases that count, within the current calendar month. */
export function purchasesThisMonth(purchases: Purchase[]): Purchase[] {
  const now = new Date();
  return purchases.filter((p) => {
    if (!countsTowardPayables(p)) return false;
    const when = new Date(p.createdAt);
    return (
      when.getMonth() === now.getMonth() &&
      when.getFullYear() === now.getFullYear()
    );
  });
}

/* ==================================================================
   SUPPLIERS
   ================================================================== */

export function filterSuppliers(
  suppliers: Supplier[],
  query: string,
  status: Supplier["status"] | "all"
): Supplier[] {
  const q = query.trim().toLowerCase();

  return suppliers.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
      s.email.toLowerCase().includes(q)
    );
  });
}

/* ==================================================================
   WHAT RECEIVING WILL LOOK LIKE IN PRODUCTION

   Today the browser loops the lines, calls the inventory service for
   each, and flips the status. Nothing stops a second tab doing it at the
   same moment, and a crash halfway through would leave some lines
   received and the purchase still DRAFT.

   In production, one Cloud Function:

       receivePurchase(purchaseId)
             |
       check the caller's role
             |
       BEGIN FIRESTORE TRANSACTION
         read purchases/{id}
         ABORT if status !== "DRAFT"        <- the duplicate-receive guard
         for each line:
            read products/{productId}       <- stock, server-side
            write inventoryTransactions/{n} <- type PURCHASE, ref = purchase id
            update products/{productId}.stock
         update purchases/{id}: status RECEIVED, receivedAt, txn ids
       COMMIT

   TWO PROPERTIES THAT ONLY THE TRANSACTION CAN GIVE:

   1. No double receive. Both tabs read status DRAFT, both try to write,
      and Firestore lets exactly one commit. The loser retries, sees
      RECEIVED, and aborts. A UI check cannot do this - it runs against a
      snapshot fetched earlier.

   2. All or nothing. A five-line purchase either adds all five products
      or none. Without it, a failure on line three leaves two products
      stocked, a purchase marked DRAFT, and a ledger that no longer
      explains the shelves.
   ================================================================== */
