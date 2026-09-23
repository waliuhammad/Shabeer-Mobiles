"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  PackageCheck,
  Ban,
  Building2,
  Phone,
  Mail,
  Boxes,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePurchasing } from "@/context/PurchasingContext";
import {
  PURCHASE_PAYMENT_METHOD_LABELS,
  PURCHASE_PAYMENT_STATUS_CONFIG,
  PURCHASE_STATUS_CONFIG,
  canCancelPurchase,
  canReceivePurchase,
} from "@/lib/purchase-utils";
import { formatOrderDate } from "@/lib/order-utils";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";

interface PurchaseDetailViewProps {
  purchaseId: string;
}

export function PurchaseDetailView({ purchaseId }: PurchaseDetailViewProps) {
  const { getPurchase, getSupplier, receivePurchase, cancelPurchase } =
    usePurchasing();
  const purchase = getPurchase(purchaseId);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!purchase) notFound();

  const supplier = getSupplier(purchase.supplierId);
  const status = PURCHASE_STATUS_CONFIG[purchase.status];
  const payment = PURCHASE_PAYMENT_STATUS_CONFIG[purchase.paymentStatus];
  const units = purchase.items.reduce((s, i) => s + i.quantity, 0);

  const receivable = canReceivePurchase(purchase);
  const cancellable = canCancelPurchase(purchase);

  async function handleReceive() {
    const result = await receivePurchase(purchase!.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Purchase received.", {
      description: `${units} units added to inventory`,
    });
    setReceiveOpen(false);
    setError(null);
  }

  async function handleCancel() {
    const result = await cancelPurchase(purchase!.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Purchase cancelled.", { description: purchase!.purchaseNumber });
    setCancelOpen(false);
    setError(null);
  }

  return (
    <>
      {/* ---------- Screen-only toolbar ---------- */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/purchases">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Purchases
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
            Print Purchase
          </Button>

          {cancellable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="h-9 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
            >
              <Ban className="size-3.5" aria-hidden="true" />
              Cancel Purchase
            </Button>
          )}

          {receivable && (
            <Button
              type="button"
              size="sm"
              onClick={() => setReceiveOpen(true)}
              className="h-9 gap-1.5 bg-accent text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <PackageCheck className="size-3.5" aria-hidden="true" />
              Receive Purchase
            </Button>
          )}
        </div>
      </div>

      <div className="print-order space-y-4">
        {/* Print-only shop header */}
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
                {purchase.purchaseNumber}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Created {formatOrderDate(purchase.createdAt)}
              </p>
              {purchase.receivedAt && (
                <p className="text-xs text-muted-foreground">
                  Received {formatOrderDate(purchase.receivedAt)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", status.badgeClass)}>
                {status.label}
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", payment.badgeClass)}>
                Payment: {payment.label}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- INVENTORY EFFECT ---------- */}
        <section
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            purchase.status === "RECEIVED"
              ? "border-success/30 bg-success/10"
              : purchase.status === "CANCELLED"
                ? "border-destructive/30 bg-destructive/10"
                : "border-warning/30 bg-warning/10"
          )}
        >
          <Boxes
            className={cn(
              "mt-0.5 size-5 shrink-0",
              purchase.status === "RECEIVED"
                ? "text-success"
                : purchase.status === "CANCELLED"
                  ? "text-destructive"
                  : "text-warning"
            )}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {purchase.status === "RECEIVED"
                ? `Inventory received - ${units} units added`
                : purchase.status === "CANCELLED"
                  ? "Cancelled - no inventory added"
                  : "Inventory has not been updated"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status.inventoryNote}
            </p>
            {purchase.inventoryTransactionIds.length > 0 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {purchase.inventoryTransactionIds.length} inventory{" "}
                {purchase.inventoryTransactionIds.length === 1
                  ? "transaction"
                  : "transactions"}{" "}
                created &middot;{" "}
                <Link href="/admin/inventory/transactions" className="no-print text-secondary hover:underline">
                  view ledger
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* ---------- SUPPLIER ---------- */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-heading text-base font-bold text-primary">Supplier</h3>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Row Icon={Building2} label="Name" value={purchase.supplierName} />
            <Row Icon={Phone} label="Phone" value={supplier?.phone || "Not recorded"} />
            <Row Icon={Mail} label="Email" value={supplier?.email || "Not recorded"} />
          </dl>
          <Link
            href={`/admin/suppliers/${purchase.supplierId}`}
            className="no-print mt-3 inline-block text-xs font-medium text-secondary hover:text-primary"
          >
            View supplier and full history
          </Link>
        </section>

        {/* ---------- ITEMS ---------- */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3.5 font-heading text-base font-bold text-primary sm:px-5">
            Items ({units} units)
          </h3>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Items on this purchase</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">SKU</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Purchase Price</th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">Qty</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchase.items.map((item) => (
                  <tr key={item.productId}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                      {item.name}
                    </th>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      {item.sku}
                    </td>
                    {/* THE HISTORICAL COST. Read from the purchase line,
                        never from the product's current cost. */}
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPrice(item.purchasePrice)}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-foreground">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-primary">
                      {formatPrice(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border sm:hidden">
            {purchase.items.map((item) => (
              <li key={item.productId} className="space-y-1 p-4">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatPrice(item.purchasePrice)} x {item.quantity}
                  </span>
                  <span className="font-heading font-bold tabular-nums text-primary">
                    {formatPrice(item.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- SUMMARY + PAYMENT ---------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">Summary</h3>
            <dl className="space-y-2 text-sm">
              <Line label="Subtotal" value={formatPrice(purchase.subtotal)} />
              <Line
                label="Discount"
                value={purchase.discount > 0 ? `- ${formatPrice(purchase.discount)}` : formatPrice(0)}
              />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-heading text-base font-bold text-primary">Total</dt>
                <dd className="font-heading text-lg font-bold tabular-nums text-primary">
                  {formatPrice(purchase.total)}
                </dd>
              </div>
              <Line label="Paid" value={formatPrice(purchase.paidAmount)} />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Due</dt>
                <dd className={cn("font-semibold tabular-nums", purchase.dueAmount > 0 ? "text-destructive" : "text-success")}>
                  {formatPrice(purchase.dueAmount)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-base font-bold text-primary">Payment</h3>
            <dl className="space-y-2 text-sm">
              <Line
                label="Method"
                value={PURCHASE_PAYMENT_METHOD_LABELS[purchase.paymentMethod]}
              />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", payment.badgeClass)}>
                    {payment.label}
                  </span>
                </dd>
              </div>
            </dl>
            {purchase.dueAmount > 0 && purchase.status === "RECEIVED" && (
              <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                {formatPrice(purchase.dueAmount)} is an outstanding payable to{" "}
                {purchase.supplierName}.
              </p>
            )}
          </section>
        </div>

        {purchase.notes && (
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-2 font-heading text-base font-bold text-primary">Notes</h3>
            <p className="text-sm text-muted-foreground">{purchase.notes}</p>
          </section>
        )}

        {error && (
          <p role="alert" className="no-print flex items-start gap-1.5 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {purchase.status === "RECEIVED" && (
          <p className="no-print flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
            A received purchase cannot be cancelled or received again - its stock
            is already on the shelf. Correcting it needs a purchase return that
            removes the units with its own ledger entry, which is a later feature.
          </p>
        )}
      </div>

      {/* ---------- RECEIVE CONFIRMATION ---------- */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive this purchase?</DialogTitle>
            <DialogDescription>
              Receiving this purchase will add its quantities to inventory. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-sm">
            {purchase.items.map((i) => (
              <li key={i.productId} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">{i.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-success">
                  +{i.quantity}
                </span>
              </li>
            ))}
          </ul>

          <p className="rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            This creates one inventory transaction per line, each referencing{" "}
            {purchase.purchaseNumber}, so the ledger explains exactly why stock
            went up. Demo only - the change lives in this browser.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiveOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReceive}
              className="h-10 gap-1.5 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <PackageCheck className="size-4" aria-hidden="true" />
              Receive Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- CANCEL CONFIRMATION ---------- */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this purchase?</DialogTitle>
            <DialogDescription>
              {purchase.purchaseNumber} &middot; {formatPrice(purchase.total)} from{" "}
              {purchase.supplierName}
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            No stock is affected, because a draft purchase never added any. The
            purchase stays in the list as cancelled and is excluded from every
            supplier total.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} className="h-10">
              Keep Purchase
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              className="h-10 bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
