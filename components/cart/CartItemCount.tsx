"use client";

import { useCart } from "@/context/CartContext";

/**
 * The "3 items" line beside the Your Cart heading.
 *
 * A tiny client component so the page around it can stay on the server.
 * It renders nothing until the cart has hydrated, which avoids briefly
 * showing "0 items" to a customer who has three.
 */
export function CartItemCount() {
  const { totals, isHydrated } = useCart();

  if (!isHydrated) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {totals.totalItems} {totals.totalItems === 1 ? "item" : "items"}
    </p>
  );
}
