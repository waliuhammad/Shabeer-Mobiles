import { getStockStatus } from "@/lib/stock";
import { getProductCost } from "@/data/product-costs";
import type {
  InventoryRow,
  InventorySummary,
  InventoryTransaction,
  InventoryTransactionType,
  Product,
  StockStatus,
} from "@/types";

/* ==================================================================
   TRANSACTION PRESENTATION
   ================================================================== */

export const TRANSACTION_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  INITIAL_STOCK: "Initial Stock",
  PURCHASE: "Purchase",
  SALE_ONLINE: "Online Sale",
  SALE_POS: "POS Sale",
  RETURN: "Return",
  DAMAGE: "Damage",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
};

/**
 * Badge styling per type.
 *
 * Colour follows DIRECTION, not identity - greens and blues for stock
 * arriving, reds and ambers for stock leaving - so a cashier scanning the
 * ledger sees the shape of a day before reading a single word. Every
 * badge still carries its label, so colour is never the only signal.
 */
export const TRANSACTION_TYPE_STYLES: Record<InventoryTransactionType, string> = {
  INITIAL_STOCK: "bg-muted text-muted-foreground",
  PURCHASE: "bg-success/10 text-success",
  RETURN: "bg-cyan-soft text-secondary",
  SALE_POS: "bg-primary/10 text-primary",
  SALE_ONLINE: "bg-primary/10 text-primary",
  DAMAGE: "bg-destructive/10 text-destructive",
  ADJUSTMENT: "bg-warning/15 text-gold-deep",
  TRANSFER: "bg-chart-4/10 text-chart-4",
};

/** Every type, in a sensible filter order. */
export const TRANSACTION_TYPES: InventoryTransactionType[] = [
  "INITIAL_STOCK",
  "PURCHASE",
  "SALE_POS",
  "SALE_ONLINE",
  "RETURN",
  "DAMAGE",
  "ADJUSTMENT",
  "TRANSFER",
];

/** "+5" / "-2". The sign is the data; this just formats it. */
export function formatSignedQuantity(quantity: number): string {
  return quantity > 0 ? `+${quantity}` : String(quantity);
}

/* ==================================================================
   THE CENTRAL STOCK-CHANGE FUNCTION

   ONE function performs every stock movement. Not one per screen, not
   one per transaction type - one.

   That matters because the rules it enforces (no negative stock, always
   write a transaction, always record before/after) are only guarantees
   if there is no second code path that skips them. The day someone
   writes `product.stock = 8` somewhere else, the ledger stops explaining
   reality and the whole audit trail is worthless.

   PHASE 2: the body of this becomes a Firestore transaction inside a
   Cloud Function. The signature barely changes; what changes is WHERE it
   runs and therefore whether it can be trusted. See the note at the
   bottom of this file.
   ================================================================== */

export interface StockChangeRequest {
  productId: string;
  productName: string;
  productSku: string;
  type: InventoryTransactionType;
  /** SIGNED: negative removes stock, positive adds it. */
  quantity: number;
  referenceId?: string;
  note?: string;
  createdBy: string;
}

export type StockChangeResult =
  | { ok: true; transaction: InventoryTransaction; newStock: number }
  | { ok: false; error: string };

/**
 * Applies one movement to one product.
 *
 * Steps, in order, and all of them matter:
 *   1. read the current stock
 *   2. compute what it would become
 *   3. REJECT if that is negative
 *   4. build the transaction, recording before and after
 *   5. hand back the new stock for the caller to store
 *
 * Note it does not mutate anything itself. It returns the transaction and
 * the new figure, and the caller commits both together. That keeps the
 * rule pure and testable, and it mirrors how the Firestore version will
 * work: compute inside the transaction, write both documents atomically.
 */
export function applyStockChange(
  currentStock: number,
  request: StockChangeRequest
): StockChangeResult {
  if (!Number.isInteger(request.quantity) || request.quantity === 0) {
    return { ok: false, error: "Quantity must be a whole number and not zero." };
  }

  const newStock = currentStock + request.quantity;

  /**
   * NEGATIVE STOCK IS REJECTED, ALWAYS.
   *
   * Not clamped to zero - rejected. Clamping would silently swallow the
   * discrepancy and leave a ledger whose arithmetic no longer adds up.
   * If someone tries to remove 5 units when 2 are on the shelf, the
   * interesting fact is that the numbers disagree, and that fact must
   * reach a human rather than being rounded away.
   */
  if (newStock < 0) {
    return {
      ok: false,
      error: `Insufficient stock. Only ${currentStock} ${
        currentStock === 1 ? "unit is" : "units are"
      } available.`,
    };
  }

  return {
    ok: true,
    newStock,
    transaction: {
      id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: request.productId,
      productName: request.productName,
      productSku: request.productSku,
      type: request.type,
      quantity: request.quantity,
      previousStock: currentStock,
      newStock,
      referenceId: request.referenceId,
      note: request.note,
      createdBy: request.createdBy,
      createdAt: new Date().toISOString(),
    },
  };
}

/* ==================================================================
   DERIVING THE INVENTORY VIEW
   ================================================================== */

/**
 * Product + live stock + latest movement -> one table row.
 *
 * `stock` is passed in rather than read from the product, because the
 * live figure is the seed value plus every local movement. Everything
 * else comes from the ONE product record the storefront and POS also
 * use - there is no separate inventory product list.
 */
export function toInventoryRow(
  product: Product,
  stock: number,
  /** ISO timestamp of the latest movement, if there has been one. */
  lastMovementAt?: string
): InventoryRow {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    categoryName: product.categoryName,
    categorySlug: product.categorySlug,
    image: product.images[0] ?? null,
    stock,
    lowStockThreshold: product.lowStockThreshold,
    // The shared rule from lib/stock.ts - not re-implemented here.
    status: getStockStatus(stock, product.lowStockThreshold),
    price: product.price,
    lastUpdated: lastMovementAt ?? product.createdAt,
    productStatus: product.status,
  };
}

/**
 * Summary figures.
 *
 * costValue uses PURCHASE cost, never selling price. That is the money
 * actually sitting on the shelves. Valuing stock at retail would book
 * profit on goods that have not sold and might never sell.
 */
export function calculateInventorySummary(rows: InventoryRow[]): InventorySummary {
  return {
    totalProducts: rows.length,
    totalUnits: rows.reduce((sum, row) => sum + row.stock, 0),
    lowStockCount: rows.filter((r) => r.status === "low-stock").length,
    outOfStockCount: rows.filter((r) => r.status === "out-of-stock").length,
    costValue: rows.reduce(
      (sum, row) => sum + row.stock * getProductCost(row.productId),
      0
    ),
  };
}

/* ==================================================================
   FILTERING
   ================================================================== */

export interface InventoryFilterState {
  query: string;
  /** Category slug, or "all". */
  category: string;
  /** StockStatus, or "all". */
  status: StockStatus | "all";
}

/** All three filters apply together - they narrow, never replace. */
export function filterInventoryRows(
  rows: InventoryRow[],
  filters: InventoryFilterState
): InventoryRow[] {
  const q = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.category !== "all" && row.categorySlug !== filters.category) {
      return false;
    }
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (!q) return true;

    return (
      row.name.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      row.brand.toLowerCase().includes(q)
    );
  });
}

export interface TransactionFilterState {
  query: string;
  /** InventoryTransactionType, or "all". */
  type: InventoryTransactionType | "all";
  /** ISO date (yyyy-mm-dd), or "" for any date. */
  date: string;
}

export function filterTransactions(
  transactions: InventoryTransaction[],
  filters: TransactionFilterState
): InventoryTransaction[] {
  const q = filters.query.trim().toLowerCase();

  return transactions.filter((txn) => {
    if (filters.type !== "all" && txn.type !== filters.type) return false;

    // Compare the date portion only - a transaction at 14:30 must match
    // a filter for that day.
    if (filters.date && !txn.createdAt.startsWith(filters.date)) return false;

    if (!q) return true;

    return (
      txn.productName.toLowerCase().includes(q) ||
      txn.productSku.toLowerCase().includes(q) ||
      (txn.referenceId?.toLowerCase().includes(q) ?? false)
    );
  });
}

/** Newest first. The ledger is read backwards from now. */
export function sortTransactionsNewestFirst(
  transactions: InventoryTransaction[]
): InventoryTransaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** "23 Sep 2026, 14:30" - fixed locale so server and client agree. */
export function formatTransactionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ==================================================================
   WHAT THIS BECOMES IN PRODUCTION

   Today applyStockChange() runs in the browser and the caller stores the
   result in React state and localStorage. That is fine for a demo and
   worthless as a guarantee: the browser is the customer's computer.

   The production shape, inside a Cloud Function:

       client requests { productId, type, quantity, reason }
              (a REQUEST - never "set stock to 8")
                          |
       check the caller's role from their auth token
                          |
       BEGIN FIRESTORE TRANSACTION
         read products/{productId}          <- current stock, server-side
         compute newStock = stock + quantity
         reject if newStock < 0
         write inventoryTransactions/{id}   <- the ledger entry
         update products/{productId}.stock  <- the cache
       COMMIT
                          |
       return the transaction

   THE TRANSACTION IS THE POINT. Two cashiers selling the last unit at
   the same instant is an ordinary Saturday in a busy shop. Both browsers
   read "1 available", both pass their local check, and only a database
   transaction can make one of them lose. Every validation in this file
   runs against a snapshot fetched earlier, so every validation in this
   file can be stale.

   The two writes must also be atomic. A stock update without its ledger
   entry is an unexplained change; a ledger entry without its stock
   update is a lie. Firestore transactions give all-or-nothing.
   ================================================================== */
