import { getStockStatus } from "@/lib/stock";
import type {
  CatalogSummary,
  CategoryErrors,
  CategoryFormData,
  CategoryUsage,
  ProductErrors,
  ProductFilterState,
  ProductFormData,
} from "@/types/catalog";
import type { Category, Product, ProductCondition, ProductStatus } from "@/types";

/**
 * Catalogue rules and maths. No React, so every rule here can be checked
 * on its own and reused by the product form, the category page and the
 * future reports.
 */

export const PRODUCT_STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; badgeClass: string; note: string }
> = {
  active: {
    label: "Active",
    badgeClass: "bg-success/10 text-success",
    note: "Visible on the storefront and sellable at the counter.",
  },
  draft: {
    label: "Draft",
    badgeClass: "bg-muted text-muted-foreground",
    note: "Hidden from customers. Still sellable at the counter.",
  },
  archived: {
    label: "Archived",
    badgeClass: "bg-destructive/10 text-destructive",
    note: "Retired from the catalogue but kept, because past orders reference it.",
  },
};

export const PRODUCT_CONDITION_CONFIG: Record<
  ProductCondition,
  { label: string; badgeClass: string }
> = {
  new: { label: "New", badgeClass: "bg-cyan-soft text-secondary" },
  used: { label: "Used", badgeClass: "bg-accent/20 text-gold-deep" },
};

export const PRODUCT_STATUSES: ProductStatus[] = ["active", "draft", "archived"];
export const PRODUCT_CONDITIONS: ProductCondition[] = ["new", "used"];

export const EMPTY_PRODUCT_FILTERS: ProductFilterState = {
  query: "",
  categoryId: "all",
  status: "all",
  condition: "all",
  lowStockOnly: false,
};

/**
 * A product is ARCHIVED, never deleted.
 *
 * Past orders, invoices, purchases and ledger rows all point at a product
 * id. Delete the product and every one of those becomes a reference to
 * nothing - an invoice that cannot say what was sold. Archiving removes
 * it from the catalogue while keeping the history readable.
 */
export function canArchiveProduct(product: Product): boolean {
  return product.status !== "archived";
}

/** "iPhone 12 (Used)" -> "iphone-12-used" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function filterProducts(
  products: Product[],
  filters: ProductFilterState,
  getStock: (productId: string) => number
): Product[] {
  const q = filters.query.trim().toLowerCase();

  return products.filter((p) => {
    if (filters.categoryId !== "all" && p.categoryId !== filters.categoryId) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.condition !== "all" && p.condition !== filters.condition) return false;

    if (filters.lowStockOnly) {
      const level = getStockStatus(getStock(p.id), p.lowStockThreshold);
      if (level === "in-stock") return false;
    }

    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  });
}

export function hasActiveProductFilters(f: ProductFilterState): boolean {
  return (
    f.query.trim() !== "" ||
    f.categoryId !== "all" ||
    f.status !== "all" ||
    f.condition !== "all" ||
    f.lowStockOnly
  );
}

/**
 * The catalogue KPIs.
 *
 * stockValue uses the CURRENT cost, because it answers "what is sitting
 * on the shelf worth now". That is a different question from COGS, which
 * uses the cost frozen on a past sale - see lib/finance-utils.ts.
 */
export function calculateCatalogSummary(
  products: Product[],
  getStock: (productId: string) => number,
  getCost: (productId: string) => number
): CatalogSummary {
  let active = 0, draft = 0, archived = 0, lowStock = 0, outOfStock = 0;
  let stockValue = 0, retailValue = 0;

  for (const p of products) {
    if (p.status === "active") active++;
    else if (p.status === "draft") draft++;
    else archived++;

    const stock = getStock(p.id);
    const level = getStockStatus(stock, p.lowStockThreshold);
    if (level === "out-of-stock") outOfStock++;
    else if (level === "low-stock") lowStock++;

    // Archived lines are not part of what the shop is holding to sell.
    if (p.status !== "archived") {
      stockValue += stock * getCost(p.id);
      retailValue += stock * p.price;
    }
  }

  return {
    total: products.length,
    active,
    draft,
    archived,
    lowStock,
    outOfStock,
    stockValue,
    retailValue,
  };
}

/** Margin on the CURRENT prices, as a percentage, or null if unknowable. */
export function currentMargin(price: number, cost: number): number | null {
  if (price <= 0 || cost <= 0) return null;
  return ((price - cost) / price) * 100;
}

export function validateProduct(
  data: ProductFormData,
  existing: Product[],
  /** The product being edited, so it does not clash with itself. */
  currentId?: string
): ProductErrors {
  const errors: ProductErrors = {};
  const others = existing.filter((p) => p.id !== currentId);

  if (!data.name.trim()) errors.name = "Give the product a name.";

  const slug = data.slug.trim();
  if (!slug) {
    errors.slug = "A URL slug is required.";
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  } else if (others.some((p) => p.slug === slug)) {
    // The slug IS the product URL, so a duplicate would make one of the
    // two unreachable.
    errors.slug = "Another product already uses this slug.";
  }

  const sku = data.sku.trim();
  if (!sku) {
    errors.sku = "A SKU is required - the counter sells by code.";
  } else if (others.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
    errors.sku = "Another product already uses this SKU.";
  }

  if (!data.categoryId) errors.categoryId = "Choose a category.";

  const price = Number(data.price);
  if (!data.price.trim()) errors.price = "Enter the selling price.";
  else if (!Number.isFinite(price) || price <= 0) errors.price = "Price must be greater than zero.";

  if (data.originalPrice.trim()) {
    const original = Number(data.originalPrice);
    if (!Number.isFinite(original) || original <= 0) {
      errors.originalPrice = "Original price must be a positive number.";
    } else if (original <= price) {
      // Otherwise the storefront would render a discount badge showing a
      // rise, or a 0% saving.
      errors.originalPrice = "Original price must be higher than the selling price.";
    }
  }

  if (data.purchasePrice.trim()) {
    const cost = Number(data.purchasePrice);
    if (!Number.isFinite(cost) || cost < 0) {
      errors.purchasePrice = "Cost must be zero or more.";
    }
  }

  const threshold = Number(data.lowStockThreshold);
  if (!data.lowStockThreshold.trim()) {
    errors.lowStockThreshold = "Set a low-stock threshold.";
  } else if (!Number.isInteger(threshold) || threshold < 0) {
    errors.lowStockThreshold = "Threshold must be a whole number, zero or more.";
  }

  return errors;
}

/* ==================================================================
   CATEGORIES
   ================================================================== */

export function getCategoryUsage(
  categoryId: string,
  products: Product[]
): CategoryUsage {
  const owned = products.filter((p) => p.categoryId === categoryId);
  return {
    productCount: owned.length,
    activeCount: owned.filter((p) => p.status === "active").length,
    // A category with products behind it cannot be removed - every one of
    // those products would be left pointing at a category that no longer
    // exists, and the storefront filter would silently return nothing.
    canDelete: owned.length === 0,
  };
}

export function validateCategory(
  data: CategoryFormData,
  existing: Category[],
  currentId?: string
): CategoryErrors {
  const errors: CategoryErrors = {};
  const others = existing.filter((c) => c.id !== currentId);

  if (!data.name.trim()) errors.name = "Give the category a name.";
  else if (others.some((c) => c.name.toLowerCase() === data.name.trim().toLowerCase())) {
    errors.name = "A category with this name already exists.";
  }

  const slug = data.slug.trim();
  if (!slug) {
    errors.slug = "A URL slug is required.";
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  } else if (others.some((c) => c.slug === slug)) {
    errors.slug = "Another category already uses this slug.";
  }

  return errors;
}

export function createProductId(): string {
  return `p-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCategoryId(): string {
  return `cat-${Math.random().toString(36).slice(2, 8)}`;
}
