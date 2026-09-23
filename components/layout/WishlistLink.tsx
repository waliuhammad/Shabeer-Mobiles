"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

/**
 * Header wishlist icon with its live badge.
 *
 * Same pattern as CartLink: a minimal client island so StoreHeader can stay
 * a Server Component.
 *
 * Unlike the cart, the count here is simply the number of saved products -
 * a wishlist has no quantities, so ids.length IS the count.
 */
export function WishlistLink() {
  const { count, isHydrated } = useWishlist();

  const shown = isHydrated ? count : 0;

  return (
    <Link
      href="/wishlist"
      className="relative inline-flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-muted"
      aria-label={`Wishlist, ${shown} ${shown === 1 ? "item" : "items"}`}
    >
      <Heart className="size-5" aria-hidden="true" />

      {shown > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold tabular-nums text-secondary-foreground">
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}
