import type { Product, StockLevel, StockStatus } from "@/types";

/**
 * THE stock-status rule for the whole project.
 *
 * Before this file existed the same logic was written inline in four
 * different places - ProductCard, AddToCartButton, ProductActions and the
 * admin LowStockTable - each with its own thresholds. That is how a
 * product ends up showing "In Stock" on the storefront and "Critical" on
 * the dashboard at the same moment.
 *
 * One function, one answer, everywhere.
 */

/**
 * Where a product sits against its own reorder threshold.
 *
 *   out-of-stock  nothing left
 *   critical      at or below half the threshold - order today
 *   low           at or below the threshold - order this week
 *   null          healthy
 *
 * Returning null for "fine" lets callers write `{level && <Badge/>}`
 * instead of comparing against a magic "ok" string.
 */
export function getStockLevel(
  stock: number,
  lowStockThreshold: number
): StockLevel | null {
  if (stock <= 0) return "out-of-stock";
  if (stock <= Math.floor(lowStockThreshold / 2)) return "critical";
  if (stock <= lowStockThreshold) return "low";
  return null;
}

/** Convenience wrapper for a whole Product. */
export function getProductStockLevel(product: Product): StockLevel | null {
  return getStockLevel(product.stock, product.lowStockThreshold);
}

/** Labels and badge styling per level. Colour is never the only signal -
 *  every badge carries its own words. */
export const STOCK_LEVEL_STYLES: Record<
  StockLevel,
  { label: string; badgeClass: string; textClass: string }
> = {
  low: {
    label: "Low Stock",
    badgeClass: "bg-warning/15 text-gold-deep",
    textClass: "text-warning",
  },
  critical: {
    label: "Critical",
    badgeClass: "bg-destructive/10 text-destructive",
    textClass: "text-destructive",
  },
  "out-of-stock": {
    label: "Out of Stock",
    badgeClass: "bg-destructive text-destructive-foreground",
    textClass: "text-destructive",
  },
};

/** The healthy state, kept here so callers never invent their own wording. */
export const IN_STOCK_STYLE = {
  label: "In Stock",
  badgeClass: "bg-success/10 text-success",
  textClass: "text-success",
} as const;

/**
 * Can this quantity be sold right now, according to the data the BROWSER
 * currently holds?
 *
 * SECURITY NOTE - this matters more in the POS than anywhere else.
 * This is a courtesy check. It stops an honest cashier typing 5 when 3 are
 * on the shelf. It stops nothing else: the number it compares against came
 * from a page that may have loaded an hour ago, and two cashiers on two
 * tills can both pass it for the same last unit at the same instant.
 *
 * Real protection is a Firestore transaction on the server that re-reads
 * stock and rejects the sale. See lib/pos-utils.ts.
 */
export function canFulfil(quantity: number, stock: number): boolean {
  return quantity > 0 && quantity <= stock;
}

/* ==================================================================
   THE COARSE, THREE-BUCKET VIEW

   getStockLevel() above returns four states (null / low / critical /
   out-of-stock) because the dashboard's alert widget wants to know how
   URGENT a shortage is.

   The inventory page needs a different question answered: which of three
   buckets does this sit in, so it can be filtered and badged.

   Both come from the SAME two numbers and the same comparison. This is
   deliberately a second VIEW of one rule, not a second rule - change a
   threshold and both move together.
   ================================================================== */

/**
 * in-stock      stock > threshold
 * low-stock     0 < stock <= threshold
 * out-of-stock  stock === 0
 */
export function getStockStatus(
  stock: number,
  lowStockThreshold: number
): StockStatus {
  if (stock <= 0) return "out-of-stock";
  if (stock <= lowStockThreshold) return "low-stock";
  return "in-stock";
}

/** Labels and badge styling. Colour is never the only signal - every
 *  badge carries its own words. */
export const STOCK_STATUS_STYLES: Record<
  StockStatus,
  { label: string; badgeClass: string }
> = {
  "in-stock": { label: "In Stock", badgeClass: "bg-success/10 text-success" },
  "low-stock": { label: "Low Stock", badgeClass: "bg-warning/15 text-gold-deep" },
  "out-of-stock": {
    label: "Out of Stock",
    badgeClass: "bg-destructive/10 text-destructive",
  },
};
