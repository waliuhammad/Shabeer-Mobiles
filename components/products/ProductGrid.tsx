import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductGridProps {
  /** The products to render. An empty array is valid - see the empty state. */
  products: Product[];
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Renders a responsive grid of ProductCards, or an empty state.
 *
 * Deliberately "dumb": no state, no filtering, no sorting, no fetching. It
 * renders exactly the array it is given. That is why the shop, search
 * results, category pages and related products can all reuse it.
 */
export function ProductGrid({
  products,
  emptyTitle = "No products found",
  emptyMessage = "Try a different category or search term.",
  className,
}: ProductGridProps) {
  // Guard clause. Returning early keeps the happy path below un-nested.
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // MOBILE FIRST: the un-prefixed class is the phone layout. Tailwind
        // breakpoints are min-width, so each prefix takes over from that
        // width upward.
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {products.map((product) => (
        // key = the database id, NEVER the array index. When the list is
        // filtered, indexes shift and React reuses the wrong DOM node.
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
