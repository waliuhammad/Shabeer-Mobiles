"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Receipt,
  Store,
  User,
  CalendarDays,
  PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePreview } from "@/components/admin/billing/InvoicePreview";
import { useInvoices } from "@/context/InvoicesContext";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/pos-utils";
import { formatOrderDateTime } from "@/lib/order-display";
import { formatPrice, cn } from "@/lib/utils";

interface InvoiceDetailViewProps {
  /** The human reference printed on the receipt, e.g. SM-INV-0001. */
  invoiceNumber: string;
}

/**
 * One counter sale, opened.
 *
 * Until this existed, a counter invoice was the only kind of sale with
 * nowhere to go. /admin/revenue listed them and lib/finance-utils.ts
 * said so in as many words - `href: null, // counter invoices have no
 * detail route yet` - so a row on the revenue page was a dead end. An
 * online order could be opened; the sale that actually pays the rent
 * could not.
 *
 * READ FROM THE CONTEXT, not fetched here. InvoicesContext is already
 * subscribed for the whole panel, so opening an invoice costs no extra
 * Firestore read, and a sale rung up on another till appears without a
 * refresh.
 *
 * WHO CAN SEE IT: invoice lines carry purchasePrice, so firestore.rules
 * restricts invoice reads to owner and manager. A cashier's
 * subscription returns nothing and this page shows its not-found state -
 * which is the correct outcome, and the same one they get today by
 * typing the URL of any other finance page.
 */
export function InvoiceDetailView({ invoiceNumber }: InvoiceDetailViewProps) {
  const { getInvoice, loading, isHydrated } = useInvoices();
  const [printing, setPrinting] = useState(false);

  const invoice = getInvoice(invoiceNumber);

  /**
   * "Not here yet" and "not here" are different answers, and showing
   * the second while the first is true is how a working page gets
   * reported as broken. Nothing is declared missing until the
   * subscription has actually delivered.
   */
  if (!isHydrated || loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">
          No invoice numbered {invoiceNumber}
        </p>
        <p className="max-w-sm px-4 text-xs text-muted-foreground">
          It may have been deleted, or this account may not be allowed to read
          invoices - the shop&apos;s costs are on every line, so only an owner or
          a manager can open one.
        </p>
        <Button asChild variant="outline" className="mt-1 h-9 gap-1.5 text-xs">
          <Link href="/admin/revenue">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Revenue
          </Link>
        </Button>
      </div>
    );
  }

  const payment = PAYMENT_STATUS_STYLES[invoice.paymentStatus];
  const itemCount = invoice.items.reduce((n, l) => n + l.quantity, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/revenue">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Revenue
          </Link>
        </Button>
        <Button
          type="button"
          onClick={() => setPrinting(true)}
          className="h-9 gap-1.5 text-xs"
        >
          <Printer className="size-3.5" aria-hidden="true" />
          Print / receipt view
        </Button>
      </div>

      {/* ---------------- HEADER ---------------- */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-primary">
              {invoice.invoiceNumber}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatOrderDateTime(invoice.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              payment.className
            )}
          >
            {payment.label}
          </span>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Fact Icon={User} label="Customer">
            {invoice.customerId ? (
              <Link
                href={`/admin/customers/${invoice.customerId}`}
                className="hover:text-secondary"
              >
                {invoice.customerName}
              </Link>
            ) : (
              invoice.customerName
            )}
            {invoice.customerPhone && (
              <span className="block text-xs font-normal text-muted-foreground">
                {invoice.customerPhone}
              </span>
            )}
          </Fact>
          <Fact Icon={Store} label="Sold by">
            {/*
              The OWNER who served, falling back to the account for
              invoices written before the field existed - inventing a
              name for those would be worse than showing the account.
              The account is shown underneath either way: the two owners
              share a sign-in, so it is the audit trail and `soldBy` is
              the business fact.
            */}
            {invoice.soldBy ?? invoice.cashierName}
            <span className="block text-xs font-normal text-muted-foreground">
              {invoice.soldBy
                ? `At the counter · signed in as ${invoice.cashierName}`
                : "At the counter"}
            </span>
          </Fact>
          <Fact Icon={Receipt} label="Payment">
            {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
            <span className="block text-xs font-normal text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </Fact>
        </dl>
      </div>

      {/* ---------------- LINES ---------------- */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              What was sold on invoice {invoice.invoiceNumber}
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Item</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Keyed by index as well: every off-catalogue line carries
                  productId "" by design, so two would otherwise collide. */}
              {invoice.items.map((line, index) => (
                <tr key={`${line.productId}-${index}`}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-medium text-foreground">
                      {line.name}
                    </span>
                    {line.isCustom ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                        <PackageOpen className="size-3" aria-hidden="true" />
                        Off-catalogue
                      </span>
                    ) : (
                      line.sku && (
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {line.sku}
                        </span>
                      )
                    )}
                  </th>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {formatPrice(line.price)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {line.quantity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {formatPrice(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="space-y-2 border-t border-border bg-muted/30 p-4 text-sm sm:p-5">
          <Row label="Subtotal" value={formatPrice(invoice.subtotal)} />
          {invoice.discount > 0 && (
            <Row label="Discount" value={`- ${formatPrice(invoice.discount)}`} />
          )}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="font-semibold text-foreground">Total</dt>
            <dd className="font-heading text-lg font-bold tabular-nums text-primary">
              {formatPrice(invoice.total)}
            </dd>
          </div>
          <Row label="Paid" value={formatPrice(invoice.paidAmount)} />
          {invoice.dueAmount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-semibold tabular-nums text-destructive">
                {formatPrice(invoice.dueAmount)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/*
        THE COST OF THE GOODS IS NOT SHOWN, though it is on every line of
        the document this page is reading. Profit belongs on Profit &
        Loss, which is one page away and role-gated for the same reason.
        A receipt view that quietly carried margins is how a screen gets
        turned towards a customer and shows them what the shop paid.
      */}

      {printing && (
        <InvoicePreview
          invoice={invoice}
          onClose={() => setPrinting(false)}
          onNewBill={() => setPrinting(false)}
        />
      )}
    </>
  );
}

function Fact({
  Icon,
  label,
  children,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
