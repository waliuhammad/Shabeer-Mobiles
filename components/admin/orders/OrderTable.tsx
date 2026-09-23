"use client";

import Link from "next/link";
import { Eye, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { PAYMENT_STATUS_CONFIG } from "@/lib/order-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/order-display";
import { countOrderItems, formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderTableProps {
  orders: Order[];
}

/**
 * The admin order list.
 *
 * RESPONSIVE: a real table from lg up, stacked cards below. Nine columns
 * on a phone would overflow or shrink past legibility, so small screens
 * get different markup carrying the same facts.
 *
 * Order status and payment status are shown as SEPARATE badges, side by
 * side, because they genuinely differ - a delivered order can still be
 * awaiting cash.
 *
 * No purchase price, no margin. This is an order-handling screen.
 */
export function OrderTable({ orders }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No orders match</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Try a different search, status or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* ---------- lg and up: table ---------- */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Online orders, newest first</caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Order #</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Customer</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Items</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Paid?</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const count = countOrderItems(order);
              const pay = PAYMENT_STATUS_CONFIG[order.paymentStatus];

              return (
                <tr key={order.orderNumber} className="transition-colors hover:bg-muted/40">
                  <th scope="row" className="px-4 py-3 text-left">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="font-semibold text-primary hover:text-secondary"
                    >
                      {order.orderNumber}
                    </Link>
                  </th>
                  <td className="px-3 py-3">
                    <span className="block truncate font-medium text-foreground">
                      {order.customerName}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {order.phone}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {count}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                    {formatPrice(order.total)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        pay.badgeClass
                      )}
                    >
                      {pay.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {formatOrderDate(order.placedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                      <Link href={`/admin/orders/${order.orderNumber}`}>
                        <Eye className="size-3.5" aria-hidden="true" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- below lg: cards ---------- */}
      <ul className="divide-y divide-border lg:hidden">
        {orders.map((order) => {
          const count = countOrderItems(order);
          const pay = PAYMENT_STATUS_CONFIG[order.paymentStatus];

          return (
            <li key={order.orderNumber} className="space-y-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-semibold text-primary"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.customerName} &middot; {order.phone}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {count} {count === 1 ? "item" : "items"}
                </span>
                <span>&middot;</span>
                <span>{formatOrderDate(order.placedAt)}</span>
                <span>&middot;</span>
                <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    pay.badgeClass
                  )}
                >
                  {pay.label}
                </span>
                <p className="font-heading text-base font-bold tabular-nums text-primary">
                  {formatPrice(order.total)}
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs">
                <Link href={`/admin/orders/${order.orderNumber}`}>
                  <Eye className="size-3.5" aria-hidden="true" />
                  View Order
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
