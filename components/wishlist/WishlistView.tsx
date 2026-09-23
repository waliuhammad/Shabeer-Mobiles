"use client";

import Link from "next/link";
import { Heart, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/ProductGrid";
import { useWishlist } from "@/context/WishlistContext";
import { getProductById } from "@/data/products";
import type { Product } from "@/types";

/**
 * The interactive half of /wishlist.
 *
 * THE KEY IDEA: the wishlist stores only product ids. This component
 * resolves them to FRESH product data on every render, so a saved item
 * always shows today's price and today's stock - never a stale snapshot.
 *
 * PHASE 2 NOTE: getProductById reads a local array today. With Firestore,
 * the ids move up to a Server Component which batch-reads the documents and
 * passes Product[] down as a prop. This component's markup does not change.
 */
export function WishlistView() {
  const { ids, clear, isHydrated } = useWishlist();

  // Server-rendered markup must match the hydration render exactly, so we
  // show a neutral skeleton until the saved ids have loaded.
  if (!isHydrated) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-80 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  /**
   * Resolve ids -> products, dropping any that no longer exist.
   *
   * That filter is not defensive padding. A product the owner archives or
   * deletes leaves a dangling id in every customer's saved list, and
   * rendering `undefined` would crash the page.
   */
  const products = ids
    .map(getProductById)
    .filter((product): product is Product => product !== undefined);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center lg:py-24">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
          <Heart className="size-8" aria-hidden="true" />
        </span>

        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          Your wishlist is empty
        </h2>

        <p className="max-w-sm text-sm text-muted-foreground">
          Tap the heart on any product to save it here and come back to it later.
        </p>

        <Button
          asChild
          className="mt-2 h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/shop">
            Browse Products
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ProductGrid reused a fifth time. Every saved item gets the same
          card as the shop - including its live price, stock badge and
          Add to Cart button. */}
      <ProductGrid products={products} />

      <button
        type="button"
        onClick={clear}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Clear wishlist
      </button>
    </>
  );
}
