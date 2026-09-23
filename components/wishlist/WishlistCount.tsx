"use client";

import { useWishlist } from "@/context/WishlistContext";

/** The "3 items" line beside the Wishlist heading. */
export function WishlistCount() {
  const { count, isHydrated } = useWishlist();

  if (!isHydrated) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {count} {count === 1 ? "item" : "items"} saved
    </p>
  );
}
