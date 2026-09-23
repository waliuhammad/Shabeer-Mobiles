"use client";

import Link from "next/link";
import { Eye, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PURCHASE_PAYMENT_STATUS_CONFIG,
  PURCHASE_STATUS_CONFIG,
} from "@/lib/purchase-utils";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Purchase } from "@/types";

interface PurchaseTableProps {
  purchases: Purchase[];
  /** Hidden on a single supplier's history page. */
  showSupplier?: boolean;
  emptyMessage?: string;
}

/**
 * The purchase list.
 *
 * Purchase status and PAYMENT status are separate columns, because they
 * genuinely differ: a RECEIVED purchase with DUE payment is the normal
 * case and is exactly what a payable is.
 *
 * RESPONSIVE: table from lg up, cards below - eleven columns will not
 * fit on a phone at any readable size.
 */
export function PurchaseTable({
  purchases,
  showSupplier = true,
  emptyMessage = "Try a different search or filter.",
}: PurchaseTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No purchases</p>
        <p className="max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Stock purchases, newest first</caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Purchase #</th>
              {showSupplier && (
                <th scope="col" className="px-3 py-2.5 font-medium">Supplier</th>
              )}
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Items</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Paid</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Due</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchases.map((p) => {
              const status = PURCHASE_STATUS_CONFIG[p.status];
              const payment = PURCHASE_PAYMENT_STATUS_CONFIG[p.paymentStatus];
              const units = p.items.reduce((s, i) => s + i.quantity, 0);

              return (
                <tr key={p.id} className="transition-colors hover:bg-muted/40">
                  <th scope="row" className="px-4 py-3 text-left">
                    <Link
                      href={`/admin/purchases/${p.id}`}
                      className="font-semibold text-primary hover:text-secondary"
                    >
                      {p.purchaseNumber}
                    </Link>
                  </th>
                  {showSupplier && (
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/suppliers/${p.supplierId}`}
                        className="block truncate text-foreground hover:text-secondary"
                      >
                        {p.supplierName}
                      </Link>
                    </td>
                  )}
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {units}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                    {formatPrice(p.total)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {formatPrice(p.paidAmount)}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums",
                      p.dueAmount > 0 ? "text-destructive" : "text-success"
                    )}
                  >
                    {formatPrice(p.dueAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={payment.badgeClass}>{payment.label}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={status.badgeClass}>{status.label}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {formatOrderDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                      <Link href={`/admin/purchases/${p.id}`}>
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

      {/* below lg: cards */}
      <ul className="divide-y divide-border lg:hidden">
        {purchases.map((p) => {
          const status = PURCHASE_STATUS_CONFIG[p.status];
          const payment = PURCHASE_PAYMENT_STATUS_CONFIG[p.paymentStatus];
          const units = p.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <li key={p.id} className="space-y-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/purchases/${p.id}`} className="font-semibold text-primary">
                    {p.purchaseNumber}
                  </Link>
                  {showSupplier && (
                    <p className="truncate text-xs text-muted-foreground">
                      {p.supplierName}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {units} units &middot; {formatOrderDate(p.createdAt)}
                  </p>
                </div>
                <Badge className={status.badgeClass}>{status.label}</Badge>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Badge className={payment.badgeClass}>{payment.label}</Badge>
                <div className="text-right">
                  <p className="font-heading text-base font-bold tabular-nums text-primary">
                    {formatPrice(p.total)}
                  </p>
                  {p.dueAmount > 0 && (
                    <p className="text-[11px] font-medium tabular-nums text-destructive">
                      {formatPrice(p.dueAmount)} due
                    </p>
                  )}
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs">
                <Link href={`/admin/purchases/${p.id}`}>
                  <Eye className="size-3.5" aria-hidden="true" />
                  View Purchase
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}
