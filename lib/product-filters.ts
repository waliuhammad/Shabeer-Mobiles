import type { Product, SortOption } from "@/types";

export interface ProductFilters {
  /** A category slug, or "all". */
  categorySlug: string;
  /** Free-text search. Empty string means "no search". */
  query: string;
}

/**
 * Filters products by category and search text.
 *
 * Pure function: same inputs always produce the same output, and it mutates
 * nothing. `products.filter()` returns a NEW array - the original in
 * data/products.ts is never touched.
 */
export function filterProducts(
  products: Product[],
  { categorySlug, query }: ProductFilters
): Product[] {
  // Normalise once, outside the loop, rather than per product.
  const q = query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory =
      categorySlug === "all" || product.categorySlug === categorySlug;

    if (!matchesCategory) return false;
    if (q === "") return true;

    // Searching name + brand + category means "iphone", "apple" and
    // "used mobiles" all find the iPhone 12. Customers search all three ways.
    return (
      product.name.toLowerCase().includes(q) ||
      product.brand.toLowerCase().includes(q) ||
      product.categoryName.toLowerCase().includes(q)
    );
  });
}

/**
 * Sorts a product list. Returns a NEW array.
 *
 * `[...products]` copies first because .sort() mutates in place - sorting
 * the prop directly would corrupt the caller's array, a classic React bug.
 */
export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products];

  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "popular":
    default:
      // Proxy for popularity until real sales data exists (a later phase
      // will sort by units sold from the `sales` collection).
      return copy.sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller));
  }
}
