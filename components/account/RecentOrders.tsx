import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { countOrderItems, formatOrderDate } from "@/lib/order-utils";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";

interface RecentOrdersProps {
  orders: Order[];
  title?: string;
}

/**
 * The order history table.
 *
 * RESPONSIVE STRATEGY: a real <table> from md up, and stacked cards below
 * it. A six-column table on a 360px screen either overflows horizontally or
 * shrinks the text to nothing, so the mobile layout is genuinely different
 * markup rather than a squeezed table. The data behind both is identical.
 */
export function RecentOrders({ orders, title = "Recent Orders" }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
          <Package className="size-7" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground">No orders yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          When you place an order it will appear here with its status.
        </p>
        <Button
          asChild
          className="mt-1 h-10 gap-2 bg-accent px-5 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/shop">
            Start Shopping
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <h2 className="border-b border-border px-5 py-4 font-heading text-lg font-bold text-primary">
        {title}
      </h2>

      {/* ---------- DESKTOP: real table ---------- */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Your orders, with date, item count, total and current status
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-medium">Order #</th>
              <th scope="col" className="px-5 py-3 font-medium">Date</th>
              <th scope="col" className="px-5 py-3 font-medium">Items</th>
              <th scope="col" className="px-5 py-3 font-medium">Total</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const count = countOrderItems(order);
              return (
                <tr key={order.orderNumber} className="transition-colors hover:bg-muted/40">
                  <th scope="row" className="px-5 py-4 text-left font-semibold text-primary">
                    {order.orderNumber}
                  </th>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatOrderDate(order.placedAt)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {count} {count === 1 ? "item" : "items"}
                  </td>
                  <td className="px-5 py-4 font-medium tabular-nums text-foreground">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/tracking?order=${encodeURIComponent(order.orderNumber)}`}
                      className="font-medium text-secondary transition-colors hover:text-primary"
                    >
                      View Order
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- MOBILE: stacked cards ---------- */}
      <ul className="divide-y divide-border md:hidden">
        {orders.map((order) => {
          const count = countOrderItems(order);
          return (
            <li key={order.orderNumber} className="space-y-2 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatOrderDate(order.placedAt)} &middot; {count}{" "}
                    {count === 1 ? "item" : "items"}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="font-heading font-bold tabular-nums text-primary">
                  {formatPrice(order.total)}
                </p>
                <Link
                  href={`/tracking?order=${encodeURIComponent(order.orderNumber)}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-secondary"
                >
                  View Order
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
