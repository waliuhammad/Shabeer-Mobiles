"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useInventory } from "@/context/InventoryContext";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc } from "@/lib/firebase/write";
import { useAuth } from "@/context/AuthContext";
import {
  calculatePurchaseTotals,
  canCancelPurchase,
  canReceivePurchase,
  nextPurchaseNumber,
} from "@/lib/purchase-utils";
import type { StockChangeRequest } from "@/lib/inventory-utils";
import type {
  Purchase,
  PurchaseDraftItem,
  PurchasePaymentMethod,
  Supplier,
  SupplierFormData,
} from "@/types";


/**
 * Suppliers and purchases, plus the receiving operation.
 *
 * WHY THIS SITS BESIDE InventoryContext RATHER THAN DUPLICATING IT
 * ----------------------------------------------------------------
 * Receiving a purchase moves stock, and there is exactly ONE code path
 * that moves stock: applyStockChange(), reached through
 * InventoryContext.recordMovements(). This context calls that. It does
 * not have its own updateStock, and must never grow one - the moment a
 * second path exists, the guarantees that path enforces (no negative
 * stock, always write a ledger entry) stop being guarantees.
 *
 *     PurchasingContext.receivePurchase()
 *            |
 *     InventoryContext.recordMovements()
 *            |
 *     applyStockChange()  <- the single mutation point
 *            |
 *     InventoryTransaction (type PURCHASE, referenceId = purchase.id)
 *
 * KNOWN LIMITATION: like every other mock store here, this lives in one
 * browser. Real receiving must be a server transaction - see the note at
 * the bottom of lib/purchase-utils.ts.
 */
export type PurchaseActionResult =
  | { ok: true; purchase: Purchase }
  | { ok: false; error: string };

interface PurchasingContextValue {
  suppliers: Supplier[];
  purchases: Purchase[];
  getSupplier: (id: string) => Supplier | undefined;
  getPurchase: (id: string) => Purchase | undefined;
  getSupplierPurchases: (supplierId: string) => Purchase[];

  createSupplier: (data: SupplierFormData) => Promise<Supplier>;
  updateSupplier: (id: string, data: SupplierFormData) => Promise<Supplier | undefined>;

  createPurchase: (input: {
    supplierId: string;
    items: PurchaseDraftItem[];
    discount: number;
    paidAmount: number;
    paymentMethod: PurchasePaymentMethod;
    notes: string;
  }) => Promise<PurchaseActionResult>;

  /** DRAFT -> RECEIVED, and moves stock. */
  receivePurchase: (id: string) => Promise<PurchaseActionResult>;
  /** DRAFT -> CANCELLED. Never allowed on a received purchase. */
  cancelPurchase: (id: string) => Promise<PurchaseActionResult>;

  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const PurchasingContext = createContext<PurchasingContextValue | null>(null);

export function PurchasingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { recordMovements } = useInventory();

  // Supplier prices are cost data - owner and manager only.
  const enabled = !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";

  const suppliersState = useFirestoreCollection<Supplier>(
    COLLECTIONS.suppliers,
    (doc) => {
      const d = doc.data();
      if (typeof d.name !== "string") return null;
      const supplier: Supplier = {
        id: doc.id,
        name: d.name,
        contactPerson: typeof d.contactPerson === "string" ? d.contactPerson : "",
        phone: typeof d.phone === "string" ? d.phone : "",
        email: typeof d.email === "string" ? d.email : "",
        address: typeof d.address === "string" ? d.address : "",
        city: typeof d.city === "string" ? d.city : "",
        notes: typeof d.notes === "string" ? d.notes : "",
        status: d.status === "inactive" ? "inactive" : "active",
        createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
        updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
      };
      return supplier;
    },
    { enabled }
  );

  const purchasesState = useFirestoreCollection<Purchase>(
    COLLECTIONS.purchases,
    (doc) => {
      const d = doc.data();
      if (typeof d.purchaseNumber !== "string" || !Array.isArray(d.items)) return null;
      return { ...(d as object), id: doc.id } as Purchase;
    },
    { enabled }
  );

  const suppliers = suppliersState.items;
  const purchases = useMemo(
    () => [...purchasesState.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [purchasesState.items]
  );

  const getSupplier = useCallback(
    (id: string) => suppliers.find((s) => s.id === id),
    [suppliers]
  );
  const getPurchase = useCallback(
    (id: string) => purchases.find((p) => p.id === id),
    [purchases]
  );
  const getSupplierPurchases = useCallback(
    (supplierId: string) =>
      purchases.filter((p) => p.supplierId === supplierId),
    [purchases]
  );

  /** Upsert helper - a changed seed purchase shadows it by id. */
  const upsertPurchase = useCallback(async (purchase: Purchase) => {
    await writeDoc(COLLECTIONS.purchases, purchase.id, purchase);
  }, []);

  const createSupplier = useCallback(async (data: SupplierFormData): Promise<Supplier> => {
    const now = new Date().toISOString();
    const supplier: Supplier = {
      id: `sup-${Date.now().toString(36)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await writeDoc(COLLECTIONS.suppliers, supplier.id, supplier);
    return supplier;
  }, []);

  const updateSupplier = useCallback(
    async (id: string, data: SupplierFormData): Promise<Supplier | undefined> => {
      const existing = suppliers.find((s) => s.id === id);
      if (!existing) return undefined;

      const updated: Supplier = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await writeDoc(COLLECTIONS.suppliers, id, updated);
      return updated;
    },
    [suppliers]
  );

  /**
   * Create a purchase. ALWAYS as a DRAFT.
   *
   * A purchase is never born received: somebody has to physically count
   * the boxes in, and that is a separate, deliberate action.
   */
  const createPurchase = useCallback(
    async (input: {
      supplierId: string;
      items: PurchaseDraftItem[];
      discount: number;
      paidAmount: number;
      paymentMethod: PurchasePaymentMethod;
      notes: string;
    }): Promise<PurchaseActionResult> => {
      const supplier = getSupplier(input.supplierId);
      if (!supplier) return { ok: false, error: "Choose a supplier." };
      if (input.items.length === 0) {
        return { ok: false, error: "Add at least one product." };
      }
      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          return { ok: false, error: `${item.name}: quantity must be a whole number of at least 1.` };
        }
        if (!Number.isFinite(item.purchasePrice) || item.purchasePrice < 0) {
          return { ok: false, error: `${item.name}: purchase price cannot be negative.` };
        }
      }

      const totals = calculatePurchaseTotals(
        input.items,
        input.discount,
        input.paidAmount
      );
      const now = new Date().toISOString();

      const purchase: Purchase = {
        id: `purchase_${Date.now().toString(36)}`,
        purchaseNumber: nextPurchaseNumber(purchases),
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: input.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          // Frozen here, forever. Never re-read from current costs.
          purchasePrice: i.purchasePrice,
          total: i.quantity * i.purchasePrice,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: totals.paymentStatus,
        status: "DRAFT",
        notes: input.notes.trim(),
        createdAt: now,
        updatedAt: now,
        inventoryTransactionIds: [],
      };

      await upsertPurchase(purchase);
      return { ok: true, purchase };
    },
    [getSupplier, purchases, upsertPurchase]
  );

  /**
   * RECEIVE - the operation that actually moves stock.
   *
   * Order of operations matters:
   *   1. guard against receiving twice
   *   2. hand every line to the inventory service as ONE batch
   *   3. only if that succeeds, mark the purchase received
   *
   * Doing it the other way round - flipping the status first - would
   * leave a purchase marked RECEIVED whose stock never arrived if the
   * batch failed.
   */
  const receivePurchase = useCallback(
    async (id: string): Promise<PurchaseActionResult> => {
      const purchase = getPurchase(id);
      if (!purchase) return { ok: false, error: "Purchase not found." };

      // THE DUPLICATE-RECEIVE GUARD. Checks both the status and whether
      // ledger entries already exist, so stock cannot be added twice.
      if (!canReceivePurchase(purchase)) {
        return {
          ok: false,
          error:
            purchase.status === "RECEIVED"
              ? "This purchase has already been received. Receiving it again would add the stock twice."
              : `A ${purchase.status.toLowerCase()} purchase cannot be received.`,
        };
      }

      const requests: StockChangeRequest[] = purchase.items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        productSku: item.sku,
        type: "PURCHASE",
        // POSITIVE - stock arriving. The ledger's sign convention.
        quantity: item.quantity,
        // This is what lets anyone reading the ledger later ask "why did
        // stock go up by 20?" and get "because of PUR-0005".
        referenceId: purchase.purchaseNumber,
        note: `Received from ${purchase.supplierName}`,
        createdBy: user?.displayName ?? user?.email ?? "Admin",
      }));

      // Stock and the ledger are written first. Only if that succeeds is
      // the purchase marked received - the other order would leave a
      // purchase claiming stock that never arrived.
      const result = await recordMovements(requests);
      if (!result.ok) return { ok: false, error: result.error };

      const now = new Date().toISOString();
      const received: Purchase = {
        ...purchase,
        status: "RECEIVED",
        receivedAt: now,
        updatedAt: now,
        inventoryTransactionIds: result.transactions.map((t: { id: string }) => t.id),
      };

      await upsertPurchase(received);
      return { ok: true, purchase: received };
    },
    [getPurchase, recordMovements, upsertPurchase, user]
  );

  /**
   * Cancel. DRAFT only.
   *
   * A received purchase is never cancelled: its stock is on the shelf,
   * and flipping a status would leave those units unexplained. The
   * correction is a purchase RETURN that removes them with its own
   * ledger entry - a later feature.
   */
  const cancelPurchase = useCallback(
    async (id: string): Promise<PurchaseActionResult> => {
      const purchase = getPurchase(id);
      if (!purchase) return { ok: false, error: "Purchase not found." };

      if (!canCancelPurchase(purchase)) {
        return {
          ok: false,
          error:
            purchase.status === "RECEIVED"
              ? "Received purchases cannot be cancelled directly - the stock is already on the shelf. Use a purchase return."
              : "This purchase is already cancelled.",
        };
      }

      const cancelled: Purchase = {
        ...purchase,
        status: "CANCELLED",
        updatedAt: new Date().toISOString(),
      };
      await upsertPurchase(cancelled);
      return { ok: true, purchase: cancelled };
    },
    [getPurchase, upsertPurchase]
  );

  const value = useMemo(
    () => ({
      suppliers,
      purchases,
      getSupplier,
      getPurchase,
      getSupplierPurchases,
      createSupplier,
      updateSupplier,
      createPurchase,
      receivePurchase,
      cancelPurchase,
      loading: suppliersState.loading || purchasesState.loading,
      error: suppliersState.error ?? purchasesState.error,
      isHydrated: !(suppliersState.loading || purchasesState.loading),
    }),
    [
      suppliers,
      purchases,
      getSupplier,
      getPurchase,
      getSupplierPurchases,
      createSupplier,
      updateSupplier,
      createPurchase,
      receivePurchase,
      cancelPurchase,
      suppliersState.loading,
      suppliersState.error,
      purchasesState.loading,
      purchasesState.error,
    ]
  );

  return (
    <PurchasingContext.Provider value={value}>
      {children}
    </PurchasingContext.Provider>
  );
}

export function usePurchasing(): PurchasingContextValue {
  const context = useContext(PurchasingContext);
  if (!context) {
    throw new Error("usePurchasing must be used inside a <PurchasingProvider>");
  }
  return context;
}
