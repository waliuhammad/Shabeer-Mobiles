"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, PackageSearch, SearchX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { ProductImage } from "@/components/products/ProductImage";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  countOrderItems,
  findOrder,
  formatOrderDate,
  toCustomerOrder,
} from "@/lib/order-utils";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/checkout-utils";

interface TrackingViewProps {
  /** Read from ?order= by the server page. "" when absent. */
  initialOrderNumber: string;
}

/**
 * Order tracking.
 *
 * "use client" because the customer types into a box and the result changes
 * without a page reload.
 *
 * THREE STATES, all handled explicitly:
 *   1. nothing searched yet  -> a prompt
 *   2. searched, not found   -> a clear "we could not find it"
 *   3. found                 -> the timeline and order details
 */
export function TrackingView({ initialOrderNumber }: TrackingViewProps) {
  const router = useRouter();
  const isHydrated = useIsHydrated();

  const [input, setInput] = useState(initialOrderNumber);
  /** What we last actually searched for - not what is currently typed. */
  const [query, setQuery] = useState(initialOrderNumber);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = input.trim();
    setQuery(cleaned);

    /*
      Push the search into the URL too, so /tracking?order=SM-1001 is
      shareable, bookmarkable and survives a refresh. `scroll: false` stops
      the page jumping to the top on every search.
    */
    router.replace(
      cleaned ? `/tracking?order=${encodeURIComponent(cleaned)}` : "/tracking",
      { scroll: false }
    );
  }

  /*
    findOrder reads localStorage, which the server cannot. Looking it up
    only after hydration keeps the first client render identical to the
    server HTML.
  */
  // Stripped before render - tracking is a customer-facing page.
  const found = isHydrated && query ? findOrder(query) : undefined;
  const order = found ? toCustomerOrder(found) : undefined;
  const method = order
    ? PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---------------- SEARCH ---------------- */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <label
          htmlFor="order-number"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Order Number
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="order-number"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SM-1001"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <Button
            type="submit"
            className="h-11 shrink-0 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            Track
          </Button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Demo data: try <strong className="font-semibold">SM-1001</strong>,
          SM-1002 or SM-1003. Orders you place in this browser are trackable too.
        </p>
      </form>

      {/* ---------------- RESULT ---------------- */}
      {/* aria-live so a screen reader announces the result after searching,
          without moving focus away from the input. */}
      <div className="mt-6" aria-live="polite">
        {!query && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-14 text-center">
            <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">
              Enter your order number to track your order.
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              You will find it on your order confirmation.
            </p>
          </div>
        )}

        {query && isHydrated && !order && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-14 text-center">
            <SearchX className="size-8 text-destructive" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">
              We couldn&apos;t find an order with this number.
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Check the number and try again, or call the shop and we will look
              it up for you.
            </p>
            <Button asChild variant="outline" className="mt-1 h-10 px-4 text-sm font-medium">
              <Link href="/contact">Contact the Shop</Link>
            </Button>
          </div>
        )}

        {order && (
          <div className="space-y-4">
            {/* --- Summary --- */}
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold text-primary">
                    {order.orderNumber}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Placed {formatOrderDate(order.placedAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Row label="Customer" value={order.customerName} />
                <Row label="Phone" value={order.phone} />
                <Row
                  label="Items"
                  value={`${countOrderItems(order)} ${
                    countOrderItems(order) === 1 ? "item" : "items"
                  }`}
                />
                <Row label="Payment" value={method?.label ?? order.paymentMethod} />
                <Row label="Delivery Address" value={`${order.address}, ${order.city}`} wide />
                <Row label="Total" value={formatPrice(order.total)} />
              </dl>
            </section>

            {/* --- Items --- */}
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-primary">
                Items in this order
              </h2>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      sizes="64px"
                      wrapperClassName="size-14 shrink-0 rounded-lg border border-border"
                      iconClassName="size-4"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-secondary"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* --- Timeline --- */}
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-5 font-heading text-lg font-bold text-primary">
                Order Status
              </h2>
              <OrderTimeline status={order.status} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
