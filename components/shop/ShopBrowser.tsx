"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductGrid } from "@/components/products/ProductGrid";
import { CategoryFilter } from "@/components/shop/CategoryFilter";
import { filterProducts, sortProducts } from "@/lib/product-filters";
import type { Category, Product, SortOption } from "@/types";

interface ShopBrowserProps {
  /** Every active product, passed down from the Server Component. */
  products: Product[];
  categories: Category[];
  /** Starting values, read from the URL by the server page. */
  initialCategory: string;
  initialQuery: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

/**
 * The interactive half of the shop page.
 *
 * "use client" is required because this component uses useState and event
 * handlers, which only exist in the browser. It is deliberately the ONLY
 * client component on this route - the page shell above it stays on the
 * server.
 */
export function ShopBrowser({
  products,
  categories,
  initialCategory,
  initialQuery,
}: ShopBrowserProps) {
  /* ---------------- STATE ----------------
     Three pieces, each one thing the user can change.
     Initialised from props so a URL like /shop?category=chargers arrives
     pre-filtered. After that, this component owns them. */
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>("popular");
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---------------- DERIVED DATA ----------------
     NOT state. Computed from state on every render.

     A common mistake is a fourth useState for the filtered list, kept in
     sync with useEffect. That creates two sources of truth that WILL drift.
     If a value can be calculated, calculate it.

     useMemo caches the result between renders unless a dependency changed.
     With 11 products it is unnecessary; with 500 from Firestore it matters,
     and it costs nothing to establish the habit now. */
  const visibleProducts = useMemo(() => {
    const filtered = filterProducts(products, {
      categorySlug: activeCategory,
      query,
    });
    return sortProducts(filtered, sort);
  }, [products, activeCategory, query, sort]);

  const hasActiveFilters = activeCategory !== "all" || query.trim() !== "";

  function handleSelectCategory(slug: string) {
    setActiveCategory(slug);
    setDrawerOpen(false); // close the mobile drawer after choosing
  }

  function clearFilters() {
    setActiveCategory("all");
    setQuery("");
  }

  // Rendered twice - desktop sidebar and mobile drawer - from ONE state.
  const filterPanel = (
    <CategoryFilter
      categories={categories}
      products={products}
      activeSlug={activeCategory}
      onSelect={handleSelectCategory}
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* ---------- DESKTOP SIDEBAR ---------- */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-28 rounded-xl border border-border bg-card p-4">
          {filterPanel}
        </div>
      </aside>

      {/* ---------- MAIN AREA ---------- */}
      <div className="min-w-0 flex-1">
        {/* Search + mobile filter trigger */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="shop-search"
              type="search"
              value={query}
              // CONTROLLED INPUT: value comes from state, every keystroke
              // updates state, which re-renders and filters instantly.
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mobiles, chargers, covers..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Mobile only - reuses the Sheet primitive */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-primary transition-colors hover:bg-muted lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filter
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-4">
              <SheetHeader className="mb-4 p-0">
                <SheetTitle className="text-left">Filter Products</SheetTitle>
              </SheetHeader>
              {filterPanel}
            </SheetContent>
          </Sheet>
        </div>

        {/* Toolbar: result count + sort */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* aria-live announces the new count to screen readers when
                filters change, without moving focus. */}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {visibleProducts.length}
              </span>{" "}
              of {products.length} products
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-border"
              >
                <X className="size-3" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="shop-sort" className="text-sm text-muted-foreground">
              Sort:
            </label>
            {/* A NATIVE select, not a custom dropdown. On mobile it opens the
                OS picker - better UX than any JS menu, keyboard accessible
                for free, and zero extra dependencies. */}
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* THE GRID. It receives the derived array and renders it. It knows
            nothing about categories, search or sorting. */}
        <ProductGrid
          products={visibleProducts}
          emptyTitle="No products match your filters"
          emptyMessage="Try a different category, or clear your search and start again."
        />
      </div>
    </div>
  );
}
