"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X, PackageSearch } from "lucide-react";
import { POSProductCard } from "@/components/admin/billing/POSProductCard";
import { useCatalog } from "@/context/CatalogContext";
import type { Product } from "@/types";

interface POSProductSearchProps {
  onAdd: (product: Product) => void;
  getBilledQuantity: (productId: string) => number;
}

/**
 * Product lookup for the counter.
 *
 * Searches name, SKU, brand AND category in one box. A cashier should
 * never have to decide which field they are searching - they type what
 * the customer said ("samsung", "charger", "SAM-CHG-25W") and get hits.
 *
 * Reads the SAME data/products.ts the storefront reads. There is one
 * product catalogue; the POS is just another reader of it.
 */
export function POSProductSearch({
  onAdd,
  getBilledQuantity,
}: POSProductSearchProps) {
  // Live catalogue, so a product added or repriced in /admin/products
  // is sellable at the counter immediately.
  const { activeProducts } = useCatalog();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Loaded once. In Phase 2 this becomes a Firestore query, and for a
  // counter it is worth keeping the catalogue in memory: the shop's
  // internet dropping should not stop them ringing up a sale.
  const products = activeProducts;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [products, query]);

  /**
   * Enter adds the ONLY match.
   *
   * This is the barcode path: a scanner types the SKU and presses Enter.
   * With one result that is unambiguous, so it goes straight onto the
   * bill and the box clears, ready for the next scan. Any other number of
   * matches does nothing, because guessing would be worse than waiting.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results.length === 1 && results[0].stock > 0) {
      onAdd(results[0]);
      setQuery("");
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <label htmlFor="pos-search" className="sr-only">
          Search products by name, SKU, brand or category
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="pos-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, SKU, brand or category..."
          // The cashier's hands start here on every sale.
          autoFocus
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {results.length} {results.length === 1 ? "product" : "products"}
        {query && " matching"}
      </p>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <PackageSearch className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">No products found</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Try a different name, SKU or brand.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {results.map((product) => (
              <li key={product.id}>
                <POSProductCard
                  product={product}
                  billedQuantity={getBilledQuantity(product.id)}
                  onAdd={onAdd}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
