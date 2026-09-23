"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  Wallet,
  Ban,
  User,
  Phone,
  Mail,
  MapPin,
  FileClock,
  StickyNote,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { OrderTimeline } from "@/components/admin/orders/OrderTimeline";
import {
  CancelOrderDialog,
  UpdatePaymentDialog,
  UpdateStatusDialog,
} from "@/components/admin/orders/OrderActionDialogs";
import { useOrders } from "@/context/OrdersContext";
import {
  PAYMENT_STATUS_CONFIG,
  canTransitionOrderStatus,
  getAllowedNextStatuses,
} from "@/lib/order-status";
import { PAYMENT_METHOD_LABELS, formatOrderDateTime } from "@/lib/order-display";
import { countOrderItems } from "@/lib/order-utils";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderDetailViewProps {
  /** Seed order from the server; live state comes from the context. */
  fallbackOrder: Order;
}

/**
 * /admin/orders/[id].
 *
 * The order is read from OrdersContext so admin changes show
 * immediately; the server-rendered copy is the fallback before
 * hydration. Both come from the same shared dataset.
 */
export function OrderDetailView({ fallbackOrder }: OrderDetailViewProps) {
  const { getOrder, isHydrated } = useOrders();
  const order = (isHydrated && getOrder(fallbackOrder.orderNumber)) || fallbackOrder;

  const [statusOpen, setStatusOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const pay = PAYMENT_STATUS_CONFIG[order.paymentStatus];
  const itemCount = countOrderItems(order);

  /**
   * Which actions make sense RIGHT NOW.
   *
   * Derived from the current status rather than shown unconditionally -
   * offering "Cancel Order" on a delivered order is how a cashier
   * eventually clicks it.
   */
  const canAdvance = getAllowedNextStatuses(order.status).length > 0;
  const canCancel = canTransitionOrderStatus(order.status, "cancelled");

  return (
    <>
      {/* ---------- Screen-only toolbar ---------- */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/orders">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Orders
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 text-xs"
          >
            <Printer className="size-3.5" aria-hidden="true" />
            Print Order
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPaymentOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Wallet className="size-3.5" aria-hidden="true" />
            Update Payment
          </Button>

          {canCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="h-9 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
            >
              <Ban className="size-3.5" aria-hidden="true" />
              Cancel Order
            </Button>
          )}

          {canAdvance && (
            <Button
              type="button"
              size="sm"
              onClick={() => setStatusOpen(true)}
              className="h-9 gap-1.5 bg-accent text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Update Status
            </Button>
          )}
        </div>
      </div>

      {/* ---------- Everything below prints ---------- */}
      <div className="print-order space-y-4">
        {/* Shop header - screen hides it, print shows it. */}
        <div className="hidden print:block">
          <h1 className="font-heading text-xl font-bold text-primary">
            {BUSINESS.name.toUpperCase()}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.14em] text-secondary">
            {BUSINESS.tagline}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{FULL_ADDRESS}</p>
        </div>

        {/* ---------- HEADER ---------- */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-primary">
                {order.orderNumber}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Placed {formatOrderDateTime(order.placedAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated {formatOrderDateTime(order.updatedAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span
                className={cn(
                  "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  pay.badgeClass
                )}
              >
                Payment: {pay.label}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- CUSTOMER + SHIPPING ---------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">
              Customer
            </h3>
            <dl className="space-y-2.5 text-sm">
              <Row Icon={User} label="Name" value={order.customerName} />
              <Row Icon={Phone} label="Phone" value={order.phone} />
              <Row Icon={Mail} label="Email" value={order.email || "Not provided"} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">
              Shipping
            </h3>
            <dl className="space-y-2.5 text-sm">
              <Row Icon={MapPin} label="Address" value={order.address} />
              <Row Icon={MapPin} label="City" value={order.city} />
              <Row
                Icon={MapPin}
                label="Postal Code"
                value={order.postalCode || "Not provided"}
              />
            </dl>
          </section>
        </div>

        {/* ---------- ITEMS ---------- */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3.5 font-heading text-base font-bold text-primary sm:px-5">
            Order Items ({itemCount})
          </h3>

          {/* sm and up: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Items on this order</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">SKU</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">Qty</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.productId}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                      {item.name}
                    </th>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      {item.sku || "—"}
                    </td>
                    {/* The PRICE CHARGED, frozen. Never recomputed from
                        the product's current price. */}
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-foreground">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* below sm: cards */}
          <ul className="divide-y divide-border sm:hidden">
            {order.items.map((item) => (
              <li key={item.productId} className="space-y-1 p-4">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {item.sku || "—"}
                </p>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatPrice(item.price)} x {item.quantity}
                  </span>
                  <span className="font-heading font-bold tabular-nums text-primary">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- SUMMARY + PAYMENT ---------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">
              Order Summary
            </h3>
            {/* Stored figures. An old order's total never changes because
                a product was repriced. */}
            <dl className="space-y-2 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(order.subtotal)} />
              <SummaryRow
                label="Discount"
                value={order.discount > 0 ? `- ${formatPrice(order.discount)}` : formatPrice(0)}
              />
              <SummaryRow label="Delivery Charges" value={formatPrice(order.delivery)} />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-heading text-base font-bold text-primary">Total</dt>
                <dd className="font-heading text-lg font-bold tabular-nums text-primary">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">
              Payment
            </h3>
            <dl className="space-y-2 text-sm">
              <SummaryRow
                label="Method"
                value={PAYMENT_METHOD_LABELS[order.paymentMethod]}
              />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      pay.badgeClass
                    )}
                  >
                    {pay.label}
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Payment status is tracked separately from order status - a
              delivered order can still be awaiting cash from the rider.
            </p>
          </section>
        </div>

        {/* ---------- NOTES ---------- */}
        {(order.notes || order.internalNote) && (
          <div className="grid gap-4 md:grid-cols-2">
            {order.notes && (
              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-2 flex items-center gap-2 font-heading text-base font-bold text-primary">
                  <StickyNote className="size-4 text-secondary" aria-hidden="true" />
                  Customer Note
                </h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </section>
            )}

            {order.internalNote && (
              // no-print AND never shown to the customer. Internal notes
              // exist for the shop, and a packing slip handed to a rider
              // must not carry them.
              <section className="no-print rounded-xl border border-warning/30 bg-warning/10 p-4 sm:p-5">
                <h3 className="mb-2 flex items-center gap-2 font-heading text-base font-bold text-primary">
                  <Lock className="size-4 text-warning" aria-hidden="true" />
                  Internal Note
                </h3>
                <p className="text-sm text-foreground">{order.internalNote}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Shop only. Never shown to the customer or printed.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ---------- TIMELINE + ACTIVITY ---------- */}
        <div className="no-print grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-4 font-heading text-base font-bold text-primary">
              Order Timeline
            </h3>
            <OrderTimeline status={order.status} dense />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-primary">
              <FileClock className="size-4 text-secondary" aria-hidden="true" />
              Activity History
            </h3>
            <ol className="space-y-3">
              {[...order.activity].reverse().map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm text-foreground">{entry.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatOrderDateTime(entry.at)} &middot; {entry.by}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <p className="no-print text-center text-xs text-muted-foreground">
          Status changes are saved to the database and recorded in the activity
          trail. They do not yet change stock or notify the customer.
        </p>
      </div>

      <UpdateStatusDialog order={order} open={statusOpen} onOpenChange={setStatusOpen} />
      <UpdatePaymentDialog order={order} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
