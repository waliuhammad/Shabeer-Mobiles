"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { products } from "@/data/products";
import { seedInventoryTransactions } from "@/data/mock-inventory";
import { applyStockChange } from "@/lib/inventory-utils";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { InventoryTransaction, StockAdjustmentInput } from "@/types";
import type {
  StockChangeRequest,
  StockChangeResult,
} from "@/lib/inventory-utils";

const STORAGE_KEY = "shabbir-mobiles:inventory-txns:v1";

/**
 * Holds the mock inventory ledger and derives live stock from it.
 *
 * WHY STOCK IS DERIVED, NOT STORED
 * --------------------------------
 * There is no second copy of the stock number to keep in sync. Live stock
 * for a product is simply:
 *
 *     base stock (data/products.ts)  +  every local movement since
 *
 * which makes it impossible for the displayed figure to disagree with the
 * ledger explaining it. In production the product document WILL carry a
 * cached `stock` field, because summing a ledger of 50,000 rows on every
 * page load is not viable - but there the cache and the ledger are
 * written inside one atomic transaction, so they still cannot drift.
 *
 * KNOWN LIMITATION, stated plainly: movements recorded here live in this
 * browser only. The storefront and the POS render from data/products.ts
 * on the SERVER, so an adjustment made in admin will not change the stock
 * a customer sees. That divergence is not a bug in this code - it is
 * exactly the problem a shared database removes, and it is why the real
 * version of this must be server-side.
 */
interface InventoryContextValue {
  /** Seed ledger plus everything recorded in this browser, newest last. */
  transactions: InventoryTransaction[];
  /** Live stock for one product. */
  getStock: (productId: string) => number;
  /** That product's movements, oldest first. */
  getProductTransactions: (productId: string) => InventoryTransaction[];
  /** Records a manual adjustment / damage / return. */
  adjustStock: (input: StockAdjustmentInput) => StockChangeResult;
  /**
   * Records SEVERAL movements as one all-or-nothing batch.
   *
   * Built for receiving a purchase, which must add every line or none:
   * a five-line delivery that stocks two products and then fails leaves
   * a ledger that no longer explains the shelves.
   *
   * Every movement still goes through applyStockChange(), so this is
   * not a second stock path - it is the same one, called in a loop that
   * only commits if all of them pass.
   */
  recordMovements: (requests: StockChangeRequest[]) => BatchStockResult;
  /** Discards local movements and returns to the seed ledger. */
  resetToSeed: () => void;
  /** Count of movements added in this browser. */
  localMovementCount: number;
  isHydrated: boolean;
}

export type BatchStockResult =
  | { ok: true; transactions: InventoryTransaction[] }
  | { ok: false; error: string };

const InventoryContext = createContext<InventoryContextValue | null>(null);

function readStoredTransactions(): InventoryTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is InventoryTransaction =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as InventoryTransaction).productId === "string" &&
        typeof (t as InventoryTransaction).quantity === "number"
    );
  } catch {
    return [];
  }
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  /** Only the LOCAL movements are stored; the seed is always recomputed. */
  const [localTransactions, setLocalTransactions] = useState<InventoryTransaction[]>(
    readStoredTransactions
  );
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localTransactions));
    } catch {
      // Storage blocked or full - adjustments still work for this session.
    }
  }, [localTransactions]);

  /**
   * Base stock straight from the one product catalogue. There is no
   * separate inventory product list - see data/products.ts.
   */
  const baseStock = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.id, p.stock);
    return map;
  }, []);

  /** Net local change per product, so getStock is a lookup not a scan. */
  const localDeltas = useMemo(() => {
    const map = new Map<string, number>();
    for (const txn of localTransactions) {
      map.set(txn.productId, (map.get(txn.productId) ?? 0) + txn.quantity);
    }
    return map;
  }, [localTransactions]);

  const getStock = useCallback(
    (productId: string) => {
      const base = baseStock.get(productId) ?? 0;
      // Before hydration, local movements are unknown to the server
      // render, so report the base figure and let the UI settle after.
      if (!isHydrated) return base;
      return base + (localDeltas.get(productId) ?? 0);
    },
    [baseStock, localDeltas, isHydrated]
  );

  const transactions = useMemo(
    () => (isHydrated ? [...seedInventoryTransactions, ...localTransactions] : seedInventoryTransactions),
    [localTransactions, isHydrated]
  );

  const getProductTransactions = useCallback(
    (productId: string) =>
      transactions
        .filter((t) => t.productId === productId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [transactions]
  );

  /**
   * THE ONLY WAY STOCK CHANGES in this app.
   *
   * It delegates every rule to applyStockChange() in lib/inventory-utils,
   * then commits the result. Nothing else anywhere writes a stock figure,
   * which is what makes "no negative stock" and "every movement has a
   * transaction" actual guarantees rather than conventions.
   */
  const adjustStock = useCallback(
    (input: StockAdjustmentInput): StockChangeResult => {
      const product = products.find((p) => p.id === input.productId);
      if (!product) return { ok: false, error: "Product not found." };

      if (!input.reason.trim()) {
        return { ok: false, error: "A reason is required for every adjustment." };
      }
      if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
        return { ok: false, error: "Enter a quantity greater than zero." };
      }

      // The dialog collects a positive number and a direction; the SIGN
      // is applied here, once, so the ledger's invariant always holds.
      const signed =
        input.direction === "decrease" ? -input.quantity : input.quantity;

      const request: StockChangeRequest = {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        type: input.type,
        quantity: signed,
        note: input.reason.trim(),
        createdBy: "Admin",
      };

      const result = applyStockChange(getStock(product.id), request);
      if (!result.ok) return result;

      setLocalTransactions((current) => [...current, result.transaction]);
      return result;
    },
    [getStock]
  );

  /**
   * Apply a batch, or nothing at all.
   *
   * Runs the whole set against a WORKING COPY of the stock figures
   * first. Only if every line passes does it commit - so a purchase
   * whose third line would drive stock negative adds none of its lines,
   * rather than leaving the first two applied.
   *
   * The running tally matters: two lines for the same product in one
   * purchase must see each other's effect, or the second would validate
   * against a stale figure.
   */
  const recordMovements = useCallback(
    (requests: StockChangeRequest[]): BatchStockResult => {
      if (requests.length === 0) {
        return { ok: false, error: "Nothing to record." };
      }

      const working = new Map<string, number>();
      const built: InventoryTransaction[] = [];

      for (const request of requests) {
        const current =
          working.get(request.productId) ?? getStock(request.productId);

        const result = applyStockChange(current, request);
        if (!result.ok) {
          // Abort before anything is committed.
          return { ok: false, error: result.error };
        }

        working.set(request.productId, result.newStock);
        built.push(result.transaction);
      }

      setLocalTransactions((current) => [...current, ...built]);
      return { ok: true, transactions: built };
    },
    [getStock]
  );

  const resetToSeed = useCallback(() => setLocalTransactions([]), []);

  const value = useMemo(
    () => ({
      transactions,
      getStock,
      getProductTransactions,
      adjustStock,
      recordMovements,
      resetToSeed,
      localMovementCount: isHydrated ? localTransactions.length : 0,
      isHydrated,
    }),
    [
      transactions,
      getStock,
      getProductTransactions,
      adjustStock,
      recordMovements,
      resetToSeed,
      localTransactions.length,
      isHydrated,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used inside an <InventoryProvider>");
  }
  return context;
}
