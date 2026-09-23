import type { ProductCondition, ProductStatus } from "@/types/product";

/**
 * What the admin product form collects.
 *
 * TWO THINGS ARE DELIBERATELY NOT HERE.
 *
 * 1. STOCK. Stock is owned by the inventory ledger, and the only way it
 *    may change is an inventory movement that records WHO changed it, by
 *    how much, and why (lib/inventory-utils.ts, applyStockChange). If
 *    this form could set stock directly there would be two ways to change
 *    the same number, one of them leaving no trace - and the ledger would
 *    stop reconciling with the shelf.
 *
 * 2. purchasePrice, in the sense of it living on Product. Cost is
 *    admin-only and types/product.ts refuses to carry it, so the form
 *    collects it here and the context writes it to the separate,
 *    rule-protected cost store. A type that cannot carry cost cannot
 *    leak it.
 *
 * Every numeric field is a string because HTML inputs are strings. They
 * are converted exactly once, in ProductsContext.
 */
export interface ProductFormData {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  categoryId: string;
  description: string;
  /** One feature per line in the textarea. */
  features: string;
  price: string;
  originalPrice: string;
  /** Admin-only. Written to the cost store, never onto Product. */
  purchasePrice: string;
  lowStockThreshold: string;
  condition: ProductCondition;
  status: ProductStatus;
  isFeatured: boolean;
  isBestSeller: boolean;
}

export interface ProductErrors {
  name?: string;
  slug?: string;
  sku?: string;
  categoryId?: string;
  price?: string;
  originalPrice?: string;
  purchasePrice?: string;
  lowStockThreshold?: string;
}

export interface ProductFilterState {
  query: string;
  categoryId: string | "all";
  status: ProductStatus | "all";
  condition: ProductCondition | "all";
  /** Only products at or below their low-stock threshold. */
  lowStockOnly: boolean;
}

export interface CatalogSummary {
  total: number;
  active: number;
  draft: number;
  archived: number;
  lowStock: number;
  outOfStock: number;
  /** Stock on hand valued at CURRENT cost. */
  stockValue: number;
  /** What that stock would bring in at the current selling price. */
  retailValue: number;
}

/** What the category form collects. */
export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
}

export interface CategoryErrors {
  name?: string;
  slug?: string;
}

/** A category plus the counts that decide whether it can be removed. */
export interface CategoryUsage {
  productCount: number;
  activeCount: number;
  /** A category with products behind it must never be deleted. */
  canDelete: boolean;
}
