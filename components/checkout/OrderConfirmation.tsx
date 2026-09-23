import Link from "next/link";
import { CheckCircle2, Truck, ShieldAlert, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/checkout-utils";
import { countOrderItems, formatOrderDate } from "@/lib/order-utils";
import type { Order } from "@/types";

interface OrderConfirmationProps {
  order: Order;
}

/**
 * The mock success screen.
 *
 * It is upfront that nothing was actually created. A confirmation that
 * looks real but is not would be worse than useless - you would forget,
 * demo it to the shop owner, and they would expect orders to arrive.
 */
export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const method = PAYMENT_METHODS.find((m) => m.value === order.paymentMethod);
  const itemCount = countOrderItems(order);

  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success">
        <CheckCircle2 className="size-9" aria-hidden="true" />
      </span>

      <h1 className="text-2xl font-bold text-primary sm:text-3xl">
        Order Placed Successfully
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Thank you, {order.customerName.split(" ")[0]}. We will call you shortly
        to confirm.
      </p>

      <p className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
        Your order number is{" "}
        <strong className="font-heading text-base font-bold tabular-nums text-primary">
          {order.orderNumber}
        </strong>
      </p>

      <dl className="mt-4 space-y-3 rounded-xl border border-border bg-card p-5 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Order date</dt>
          <dd className="font-medium text-foreground">
            {formatOrderDate(order.placedAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Items</dt>
          <dd className="font-medium text-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="font-medium text-foreground">{method?.label}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <dt className="font-semibold text-primary">Amount due</dt>
          <dd className="font-heading text-lg font-bold tabular-nums text-primary">
            {formatPrice(order.total)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-4 text-left text-xs leading-relaxed text-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          <strong className="font-semibold">This is a development placeholder.</strong>{" "}
          No order reached the shop, no stock was reserved and nobody was notified.
          The order is saved only in this browser so the tracking page has
          something to find. Real orders begin once Firebase is connected.
        </span>
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {/*
          The order number travels as a QUERY PARAMETER. That makes the link
          shareable and bookmarkable, and lets /tracking read it on the
          server - exactly how /shop?category= works.
        */}
        <Button
          asChild
          className="h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href={`/tracking?order=${encodeURIComponent(order.orderNumber)}`}>
            <Truck className="size-4" aria-hidden="true" />
            Track Order
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-11 gap-2 px-6 font-semibold">
          <Link href="/shop">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
