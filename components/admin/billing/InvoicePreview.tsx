"use client";

import { Printer, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/pos-utils";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";
import type { Invoice } from "@/types";

interface InvoicePreviewProps {
  invoice: Invoice;
  onClose: () => void;
  onNewBill: () => void;
}

/**
 * The printable invoice.
 *
 * NOT a shadcn Dialog, deliberately. A Dialog renders through a React
 * portal into a positioned, transformed, scroll-locked overlay - which
 * browsers print badly or not at all. This is an ordinary fixed overlay
 * that the print stylesheet in globals.css can flatten onto the page.
 *
 * BUSINESS DETAILS: name, tagline and address come from lib/constants.ts,
 * the same source the storefront footer uses. The phone number and email
 * there are still unconfirmed placeholders, so this invoice prints
 * neither - a receipt with a wrong number on it is worse than one with no
 * number, because the customer will try to call it.
 */
export function InvoicePreview({
  invoice,
  onClose,
  onNewBill,
}: InvoicePreviewProps) {
  const status = PAYMENT_STATUS_STYLES[invoice.paymentStatus];

  return (
    <div
      // print-overlay: the print stylesheet keeps this and hides the rest.
      className="print-overlay fixed inset-0 z-50 overflow-y-auto bg-foreground/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${invoice.invoiceNumber}`}
    >
      <div className="mx-auto max-w-2xl">
        {/* --- Toolbar: screen only --- */}
        <div className="no-print mb-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onNewBill}
            className="h-10 gap-1.5 bg-background px-4 text-sm font-medium"
          >
            <Plus className="size-4" aria-hidden="true" />
            New Bill
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            className="h-10 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print Invoice
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            aria-label="Close invoice"
            className="size-10 bg-background p-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* --- The invoice itself --- */}
        <article className="print-sheet rounded-xl border border-border bg-card p-6 sm:p-8">
          {/* Header */}
          <header className="border-b-2 border-primary pb-4">
            <h2 className="font-heading text-xl font-bold tracking-tight text-primary sm:text-2xl">
              {BUSINESS.name.toUpperCase()}
            </h2>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-secondary">
              {BUSINESS.tagline}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {BUSINESS.address.shop}, {BUSINESS.address.plaza}
              <br />
              {BUSINESS.address.street}, {BUSINESS.address.city}
            </p>
          </header>

          {/* Meta */}
          <div className="mt-4 grid gap-4 border-b border-border pb-4 sm:grid-cols-2">
            <dl className="space-y-1 text-xs">
              <Meta label="Invoice No." value={invoice.invoiceNumber} strong />
              <Meta
                label="Date"
                value={new Date(invoice.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              <Meta label="Cashier" value={invoice.cashierName} />
            </dl>

            <dl className="space-y-1 text-xs sm:text-right">
              {/* Snapshot fields - what was printed at the time, not a
                  live lookup of the customer's current details. */}
              <Meta label="Billed To" value={invoice.customerName} strong />
              {invoice.customerPhone && (
                <Meta label="Phone" value={invoice.customerPhone} />
              )}
            </dl>
          </div>

          {/* Items */}
          <table className="mt-4 w-full text-xs">
            <caption className="sr-only">Items on this invoice</caption>
            <thead>
              <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="py-2 font-medium">Product</th>
                <th scope="col" className="py-2 text-center font-medium">Qty</th>
                <th scope="col" className="py-2 text-right font-medium">Price</th>
                <th scope="col" className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.items.map((line) => (
                <tr key={line.productId}>
                  <th scope="row" className="py-2 text-left font-normal">
                    <span className="block font-medium text-foreground">
                      {line.name}
                    </span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {line.sku}
                    </span>
                  </th>
                  <td className="py-2 text-center tabular-nums text-foreground">
                    {line.quantity}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {formatPrice(line.price)}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums text-foreground">
                    {formatPrice(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <dl className="w-full space-y-1.5 text-xs sm:max-w-xs">
              <Row label="Subtotal" value={formatPrice(invoice.subtotal)} />
              {invoice.discount > 0 && (
                <Row label="Discount" value={`- ${formatPrice(invoice.discount)}`} />
              )}
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <dt className="font-heading text-sm font-bold text-primary">Total</dt>
                <dd className="font-heading text-base font-bold tabular-nums text-primary">
                  {formatPrice(invoice.total)}
                </dd>
              </div>
              <Row label="Paid" value={formatPrice(invoice.paidAmount)} />
              <Row label="Due" value={formatPrice(invoice.dueAmount)} />
              <Row
                label="Payment Method"
                value={PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
              />
              <div className="flex items-center justify-between pt-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      status.className
                    )}
                  >
                    {status.label.toUpperCase()}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <footer className="mt-6 border-t border-border pt-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Thank you for shopping at {BUSINESS.name}.
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {FULL_ADDRESS}
            </p>
            {/* Screen only - a printed receipt must not carry dev notes. */}
            <p className="no-print mt-2 text-[10px] font-medium text-warning">
              Demo invoice. No sale was recorded and no stock was deducted.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="inline text-muted-foreground">{label}: </dt>
      <dd
        className={cn(
          "inline",
          strong ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
