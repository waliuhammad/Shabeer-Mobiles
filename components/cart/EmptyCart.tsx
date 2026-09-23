import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of an empty table when there is nothing in the cart.
 *
 * An empty grid with headings and no rows reads as a broken page. A proper
 * empty state explains the situation and offers the one action that fixes
 * it.
 */
export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center lg:py-24">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
        <ShoppingCart className="size-8" aria-hidden="true" />
      </span>

      <h2 className="text-xl font-bold text-primary sm:text-2xl">Your cart is empty</h2>

      <p className="max-w-sm text-sm text-muted-foreground">
        Looks like you have not added anything yet. Browse mobiles, chargers,
        covers and accessories to get started.
      </p>

      <Button
        asChild
        className="mt-2 h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
      >
        <Link href="/shop">
          Continue Shopping
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
