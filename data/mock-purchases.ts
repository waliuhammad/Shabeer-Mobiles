import { derivePurchasePaymentStatus } from "@/lib/purchase-utils";
import type { Purchase, PurchaseItem, PurchasePaymentMethod, PurchaseStatus } from "@/types";

/**
 * Demo purchases.
 *
 * Covers every combination the UI must render: DRAFT / RECEIVED /
 * CANCELLED crossed with PAID / PARTIAL / DUE.
 *
 * NOTE ON PRICES: the `purchasePrice` figures below are what was paid ON
 * THAT DELIVERY, and they deliberately differ from the current costs in
 * data/product-costs.ts. PUR-0002 bought iPhone 12s at Rs 23,800 when
 * today's known cost is Rs 24,500 - that gap is the point. A historical
 * purchase must never be re-priced from current data.
 *
 * PHASE 2: becomes `purchases/{purchaseId}`, written only by trusted
 * server code.
 */

const NOW = new Date("2026-09-23T10:00:00.000Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

interface SeedPurchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: Omit<PurchaseItem, "total">[];
  discount: number;
  paidAmount: number;
  paymentMethod: PurchasePaymentMethod;
  status: PurchaseStatus;
  notes: string;
  createdDaysAgo: number;
  receivedDaysAgo?: number;
  /** Ledger ids, present only on received purchases. */
  inventoryTransactionIds: string[];
}

const SEED: SeedPurchase[] = [
  // Cleared. Real records are entered through the admin panel.
];

/**
 * Totals are COMPUTED from the lines, never typed by hand.
 *
 * A hand-typed total drifts from the items it claims to sum, which on a
 * purchase means paying a supplier the wrong amount.
 */
function buildPurchases(): Purchase[] {
  return SEED.map((seed) => {
    const items: PurchaseItem[] = seed.items.map((i) => ({
      ...i,
      total: i.quantity * i.purchasePrice,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal - seed.discount);
    const paidAmount = Math.min(seed.paidAmount, total);

    return {
      id: seed.id,
      purchaseNumber: seed.purchaseNumber,
      supplierId: seed.supplierId,
      supplierName: seed.supplierName,
      items,
      subtotal,
      discount: seed.discount,
      total,
      paidAmount,
      dueAmount: Math.max(0, total - paidAmount),
      paymentMethod: seed.paymentMethod,
      paymentStatus: derivePurchasePaymentStatus(total, paidAmount),
      status: seed.status,
      notes: seed.notes,
      createdAt: daysAgo(seed.createdDaysAgo),
      updatedAt: daysAgo(seed.receivedDaysAgo ?? seed.createdDaysAgo),
      receivedAt:
        seed.receivedDaysAgo !== undefined
          ? daysAgo(seed.receivedDaysAgo)
          : undefined,
      inventoryTransactionIds: seed.inventoryTransactionIds,
    };
  });
}

export const mockPurchases: Purchase[] = buildPurchases();
