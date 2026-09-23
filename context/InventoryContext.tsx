"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeBatchDocs } from "@/lib/firebase/write";
import {
  applyStockChange,
  type StockChangeRequest,
  type StockChangeResult,
} from "@/lib/inventory-utils";
import { useAuth } from "@/context/AuthContext";
import { useCatalog } from "@/context/CatalogContext";
import type {
  InventoryTransaction,
  InventoryTransactionType,
  StockAdjustmentInput,
} from "@/types";

/**
 * Stock and the inventory ledger - live Firestore.
 *
 * THE LEDGER IS THE TRUTH
 * -----------------------
 * Stock is not a number anybody types. It is the running total of every
 * recorded movement: goods received, a counter sale, a stock-take
 * correction. getStock() adds the movements up.
 *
 * products/{id}.stock is kept in step as a DENORMALISED COPY, because
 * the storefront renders on the server and cannot sum a ledger on every
 * page view. The two are written in the same batch, so they cannot
 * drift - if the batch fails, neither changes.
 *
 * Every movement still goes through applyStockChange(), which is the one
 * place that decides whether a change is legal. Negative stock is
 * refused there, not here.
 */

export type BatchStockResult =
  | { ok: true; transactions: InventoryTransaction[] }
  | { ok: false; error: string };

interface InventoryContextValue {
  transactions: InventoryTransaction[];
  getStock: (productId: string) => number;
  getProductTransactions: (productId: string) => InventoryTransaction[];
  adjustStock: (input: StockAdjustmentInput) => Promise<StockChangeResult>;
  recordMovements: (requests: StockChangeRequest[]) => Promise<BatchStockResult>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

const TXN_TYPES: InventoryTransactionType[] = [
  "INITIAL_STOCK", "PURCHASE", "SALE_ONLINE", "SALE_POS",
  "RETURN", "DAMAGE", "ADJUSTMENT", "TRANSFER",
];

function mapTransaction(doc: QueryDocumentSnapshot): InventoryTransaction | null {
  const d = doc.data();
  if (typeof d.productId !== "string" || typeof d.quantity !== "number") return null;
  return {
    id: doc.id,
    productId: d.productId,
    productName: typeof d.productName === "string" ? d.productName : "",
    productSku: typeof d.productSku === "string" ? d.productSku : "",
    type: (TXN_TYPES.includes(d.type) ? d.type : "ADJUSTMENT") as InventoryTransactionType,
    quantity: d.quantity,
    previousStock: typeof d.previousStock === "number" ? d.previousStock : 0,
    newStock: typeof d.newStock === "number" ? d.newStock : 0,
    referenceId: typeof d.referenceId === "string" ? d.referenceId : undefined,
    note: typeof d.note === "string" ? d.note : undefined,
    createdBy: typeof d.createdBy === "string" ? d.createdBy : "",
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
  };
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  // CatalogProvider wraps this one, so the product is available to stamp
  // its name and SKU onto the ledger row. That denormalisation is
  // deliberate: a ledger entry must still read sensibly years later,
  // even if the product was renamed or archived since.
  const { getProduct } = useCatalog();
  // The ledger exposes what the shop bought and when - owner/manager only.
  const enabled = !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";

  const state = useFirestoreCollection<InventoryTransaction>(
    COLLECTIONS.inventoryTransactions,
    mapTransaction,
    { enabled }
  );

  const transactions = useMemo(
    () => [...state.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.items]
  );

  /** Running total per product, summed from the ledger. */
  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of state.items) {
      map.set(t.productId, (map.get(t.productId) ?? 0) + t.quantity);
    }
    return map;
  }, [state.items]);

  const getStock = useCallback(
    (productId: string) => stockByProduct.get(productId) ?? 0,
    [stockByProduct]
  );

  const getProductTransactions = useCallback(
    (productId: string) => transactions.filter((t) => t.productId === productId),
    [transactions]
  );

  /**
   * Writes a ledger row AND the denormalised product stock together.
   *
   * A batch, not two writes: a dropped connection between them would
   * leave stock that no ledger row explains, and reconciling that by
   * hand is exactly the situation a ledger exists to prevent.
   */
  const commitMovements = useCallback(
    async (requests: StockChangeRequest[]): Promise<BatchStockResult> => {
      const created: InventoryTransaction[] = [];
      const operations: { collection: string; id: string; data: Record<string, unknown> }[] = [];
      // Track running stock locally so several movements against the SAME
      // product in one batch validate against each other, not against the
      // starting figure.
      const running = new Map<string, number>();

      for (const request of requests) {
        const before = running.get(request.productId) ?? getStock(request.productId);

        // THE one place a stock change is judged legal. Negative stock is
        // refused in there, not here.
        const result = applyStockChange(before, request);
        if (!result.ok) return { ok: false, error: result.error };

        running.set(request.productId, result.newStock);
        created.push(result.transaction);

        operations.push({
          collection: COLLECTIONS.inventoryTransactions,
          id: result.transaction.id,
          data: result.transaction as unknown as Record<string, unknown>,
        });
        // The denormalised copy the storefront reads, written in the SAME
        // batch so it cannot drift from the ledger.
        operations.push({
          collection: COLLECTIONS.products,
          id: request.productId,
          data: { stock: result.newStock },
        });
      }

      try {
        await writeBatchDocs(operations);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not save the movement.",
        };
      }

      return { ok: true, transactions: created };
    },
    [getStock]
  );

  const adjustStock = useCallback(
    async (input: StockAdjustmentInput): Promise<StockChangeResult> => {
      if (!input.reason.trim()) {
        return {
          ok: false,
          error: "Give a reason - an adjustment with no reason is an unexplained hole.",
        };
      }

      const signed =
        input.direction === "decrease"
          ? -Math.abs(input.quantity)
          : Math.abs(input.quantity);

      const product = getProduct(input.productId);

      const result = await commitMovements([
        {
          productId: input.productId,
          productName: product?.name ?? "",
          productSku: product?.sku ?? "",
          type: input.type,
          quantity: signed,
          note: input.reason.trim(),
          createdBy: user?.displayName ?? user?.email ?? "Admin",
        },
      ]);

      if (!result.ok) return { ok: false, error: result.error };
      const txn = result.transactions[0];
      return { ok: true, transaction: txn, newStock: txn.newStock };
    },
    [commitMovements, user, getProduct]
  );

  const recordMovements = useCallback(
    (requests: StockChangeRequest[]) => commitMovements(requests),
    [commitMovements]
  );

  const value = useMemo(
    () => ({
      transactions,
      getStock,
      getProductTransactions,
      adjustStock,
      recordMovements,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [
      transactions, getStock, getProductTransactions, adjustStock,
      recordMovements, state.loading, state.error,
    ]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used inside an <InventoryProvider>");
  }
  return context;
}
