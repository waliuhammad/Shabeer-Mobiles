"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

/**
 * The header cart icon with its live badge.
 *
 * WHY THIS IS A SEPARATE FILE.
 * StoreHeader is a Server Component - the logo, the nav links and the
 * address bar are all static and should ship no JavaScript. But the badge
 * has to read CartContext, which is browser state.
 *
 * Extracting just the icon keeps the "use client" boundary as small as
 * possible: the header stays on the server, and only this button hydrates.
 *
 * The count comes from totals.totalItems, which sums QUANTITIES, not lines.
 * iPhone x2 + Cover x1 shows 3, not 2.
 */
export function CartLink() {
  const { totals, isHydrated } = useCart();

  // Before hydration the server rendered no badge, so the client must not
  // render one either - otherwise React reports a mismatch.
  const count = isHydrated ? totals.totalItems : 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-muted"
      aria-label={`Shopping cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <ShoppingCart className="size-5" aria-hidden="true" />

      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-accent-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
