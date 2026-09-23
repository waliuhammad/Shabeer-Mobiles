"use client";

import { Trash2 } from "lucide-react";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { useCart } from "@/context/CartContext";

/**
 * The interactive half of /cart.
 *
 * "use client" because it reads CartContext, which lives in browser state.
 * The page shell above it stays a Server Component.
 */
export function CartView() {
  const { items, totals, clearCart, isHydrated } = useCart();

  /**
   * WHY THIS LOADING STATE EXISTS.
   *
   * The server renders this page with an empty cart, because the server
   * cannot read the customer's localStorage. The browser then loads the
   * saved cart in an effect. Between those two moments, rendering the empty
   * state would flash "Your cart is empty" at a customer who has three
   * items - and worse, produce a hydration mismatch.
   *
   * So until isHydrated is true we render a neutral skeleton that is
   * identical on the server and the client.
   */
  if (!isHydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    /*
      RESPONSIVE LAYOUT
      Mobile  : one column - items, then summary, then checkout button
      Desktop : items take two thirds, summary sticks in the right third
    */
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
      <section className="lg:col-span-2" aria-label="Cart items">
        <div className="rounded-xl border border-border bg-card px-4 sm:px-5">
          <ul>
            {items.map((item) => (
              // key = productId: stable, and unique because the cart merges
              // duplicates into one line rather than repeating a product.
              <CartItemRow key={item.productId} item={item} />
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Clear cart
        </button>
      </section>

      <div className="lg:sticky lg:top-28">
        <CartSummary totals={totals} />
      </div>
    </div>
  );
}
