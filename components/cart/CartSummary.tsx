import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart-utils";
import type { CartTotals } from "@/types";

interface CartSummaryProps {
  totals: CartTotals;
  /**
   * Show the Checkout / Continue Shopping buttons.
   *
   * The cart page needs them. The checkout page reuses this exact component
   * for its totals but drives navigation with its own step buttons, so it
   * passes false. One summary component, two contexts - rather than a
   * second near-identical component that would drift.
   */
  showActions?: boolean;
}

/**
 * The order summary panel.
 *
 * It does no arithmetic of its own - it receives a CartTotals object that
 * calculateCartTotals() produced. If this component added up the lines
 * itself, the cart page and the checkout page could eventually disagree
 * about the total.
 */
export function CartSummary({ totals, showActions = true }: CartSummaryProps) {
  const amountToFreeDelivery = FREE_DELIVERY_THRESHOLD - totals.subtotal;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-4 font-heading text-lg font-bold text-primary">Order Summary</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Subtotal ({totals.totalItems} {totals.totalItems === 1 ? "item" : "items"})
          </dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatPrice(totals.subtotal)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="font-medium tabular-nums text-success">
            {totals.discount > 0 ? `- ${formatPrice(totals.discount)}` : formatPrice(0)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Delivery Charges</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {totals.delivery === 0 ? (
              <span className="text-success">Free</span>
            ) : (
              formatPrice(totals.delivery)
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <dt className="font-heading text-base font-bold text-primary">Total</dt>
          <dd className="font-heading text-xl font-bold tabular-nums text-primary">
            {formatPrice(totals.total)}
          </dd>
        </div>
      </dl>

      {totals.delivery > 0 && amountToFreeDelivery > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-cyan-soft p-3 text-xs text-foreground">
          <Truck className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          Add {formatPrice(amountToFreeDelivery)} more for free delivery.
        </p>
      )}

      {showActions && (
        <div className="mt-5 flex flex-col gap-3">
          <Button
            asChild
            className="h-12 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            <Link href="/checkout">
              Proceed to Checkout
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-11 w-full font-medium">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        Prices and stock are re-checked when your order is placed.
      </p>
    </div>
  );
}
