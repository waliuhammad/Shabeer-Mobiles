"use client";

import { useState } from "react";
import { useCustomers } from "@/context/CustomersContext";
import { toast } from "sonner";
import { Receipt, Save, Plus, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { POSProductSearch } from "@/components/admin/billing/POSProductSearch";
import { POSCart } from "@/components/admin/billing/POSCart";
import { POSCustomerPanel } from "@/components/admin/billing/POSCustomerPanel";
import { POSSummary } from "@/components/admin/billing/POSSummary";
import { InvoicePreview } from "@/components/admin/billing/InvoicePreview";
import { usePOS } from "@/hooks/use-pos";
import { useInvoices } from "@/context/InvoicesContext";
import { validateBill } from "@/lib/pos-utils";
import type { Invoice } from "@/types";

/**
 * The till.
 *
 * Owns the bill in progress (via usePOS), the saved-invoice list for this
 * session, and the two dialogs. Everything below it is presentational and
 * receives props.
 *
 * DELIBERATELY NOT wired to CartContext. The storefront cart and this
 * bill look alike and are different businesses - see hooks/use-pos.ts.
 */
export function POSTerminal() {
  // Completed counter sales live in the shared store, so the bill
  // numbering continues past everything already rung up instead of
  // restarting at 1 on every page load and colliding.
  // The server issues invoice numbers from a counter document now, so
  // the till no longer guesses the next one.
  const { nextInvoiceSequence } = useInvoices();
  const pos = usePOS(nextInvoiceSequence);
  // The bill carries a customer ID; the name for validation and the
  // printed receipt is looked up from the ONE central directory.
  const { getCustomer } = useCustomers();
  const customer = getCustomer(pos.customerId);

  /**
   * Bills rung up in THIS session, newest first.
   *
   * Kept locally only so "View last invoice" is instant. The durable
   * copy goes to InvoicesContext via recordInvoice() below - that is
   * what /admin/revenue reads. Before Step 8 this array was the only
   * home a completed sale had, so counter revenue vanished on refresh.
   */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmNewBill, setConfirmNewBill] = useState(false);

  const hasItems = pos.items.length > 0;

  /**
   * MOCK save.
   *
   * What this does NOT do, on purpose: touch product stock. Inventory
   * movements are Step 4, and they belong to the server regardless - see
   * the flow documented at the bottom of lib/pos-utils.ts.
   */
  async function handleSaveBill() {
    const result = validateBill(
      pos.items,
      customer?.name ?? "",
      pos.totals,
      pos.discount,
      pos.paidAmount
    );

    if (!result.ok) {
      // One toast per problem, so the cashier sees everything wrong at
      // once rather than fixing them one at a time.
      result.errors.forEach((message) => toast.error(message));
      return;
    }

    /**
     * THE SALE IS RECORDED BY THE SERVER, not here.
     *
     * The browser sends only which products and how many. The server
     * recomputes every total from the product documents, looks up the
     * cost a cashier is not allowed to read, checks stock against the
     * database, and writes the invoice, the stock change and the ledger
     * rows in one transaction.
     *
     * That is what makes the profit figures trustworthy: a till that
     * could name its own totals and its own costs could report any
     * profit it liked.
     */
    setSaving(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: pos.customerId,
          items: pos.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          discount: pos.discount,
          paidAmount: pos.paidAmount,
          paymentMethod: pos.paymentMethod,
        }),
      });

      const payload: { invoice?: Invoice; error?: string } = await response.json();

      if (!response.ok || !payload.invoice) {
        toast.error("Sale not recorded.", {
          description: payload.error ?? "The server refused the sale.",
        });
        return;
      }

      const invoice = payload.invoice;
      setInvoices((current) => [invoice, ...current]);
      setPreviewInvoice(invoice);

      toast.success("Sale recorded.", {
        description: `${invoice.invoiceNumber} · stock updated`,
      });

      // Clear the till, ready for the next customer.
      pos.startNewBill();
    } catch {
      toast.error("Could not reach the server.", {
        description: "The sale was NOT recorded. Check the connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  /** Guarded: never wipe a bill the cashier is still building. */
  function handleNewBillRequest() {
    if (hasItems) {
      setConfirmNewBill(true);
      return;
    }
    pos.startNewBill();
  }

  function confirmStartNewBill() {
    pos.startNewBill();
    setConfirmNewBill(false);
    setPreviewInvoice(null);
    toast.info("Started a new bill.");
  }

  return (
    <>
      {/*
        LAYOUT

        An earlier version pinned the whole thing to the viewport height
        with two independently scrolling panes. It looked tidy and was
        wrong: the totals panel is tall, so it starved the bill list down
        to about two visible rows, and the nested scroll areas fought the
        page's own scrollbar.

        Now the page scrolls normally. The product list keeps its own
        bounded scroll (it can be hundreds of items), and the bill panel
        sticks to the top on desktop so the totals stay in view while the
        cashier works down the product list.
      */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_440px] 2xl:grid-cols-[1fr_540px]">
        {/* ---------------- LEFT: products ---------------- */}
        <section
          aria-label="Product search"
          className="flex min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card p-4 lg:h-[calc(100dvh-11rem)]"
        >
          <h2 className="mb-3 font-heading text-base font-bold text-primary">
            Products
          </h2>
          <POSProductSearch
            onAdd={pos.addProduct}
            getBilledQuantity={pos.getBilledQuantity}
          />
        </section>

        {/* ---------------- RIGHT: the bill ---------------- */}
        <section
          aria-label="Current bill"
          className="flex min-w-0 flex-col rounded-xl border border-border bg-card lg:sticky lg:top-20"
        >
          {/* Bill header */}
          <div className="border-b border-border p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-heading text-base font-bold text-primary">
                  <Receipt className="size-4 text-secondary" aria-hidden="true" />
                  Current Bill
                </h2>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {pos.invoiceNumber}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNewBillRequest}
                className="h-9 shrink-0 gap-1.5 px-3 text-xs font-medium"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                New Bill
              </Button>
            </div>

            <POSCustomerPanel customerId={pos.customerId} onChange={pos.setCustomer} />
          </div>

          {/* Lines. Bounded so a 20-line bill does not push the totals
              off the bottom of a laptop screen, but generous enough to
              show several items at once. */}
          <div className="max-h-[38vh] min-h-[120px] overflow-y-auto p-4 lg:max-h-[34vh]">
            <POSCart
              items={pos.items}
              onQuantityChange={pos.setQuantity}
              onRemove={pos.removeItem}
            />
          </div>

          {/* Totals + payment + save, pinned to the bottom */}
          <div className="space-y-3 border-t border-border p-4">
            <POSSummary
              totals={pos.totals}
              discountInput={pos.discount}
              paidInput={pos.paidAmount}
              paymentMethod={pos.paymentMethod}
              onDiscountChange={pos.setDiscount}
              onPaidChange={pos.setPaidAmount}
              onPaymentMethodChange={pos.setPaymentMethod}
            />

            <Button
              type="button"
              onClick={handleSaveBill}
              // Disabled while the server is recording it, so a double
              // click cannot ring the same sale up twice.
              disabled={!hasItems || saving}
              className="h-12 w-full gap-2 bg-accent text-base font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Recording sale..." : "Save Bill"}
            </Button>

            {invoices.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewInvoice(invoices[0])}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                View last invoice ({invoices[0].invoiceNumber})
              </button>
            )}

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <AlertCircle
                className="mt-px size-3 shrink-0 text-warning"
                aria-hidden="true"
              />
              Demo mode: saving produces an invoice but does not record a sale
              or change stock.
            </p>
          </div>
        </section>
      </div>

      {/* ---------------- Invoice preview / print ---------------- */}
      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onNewBill={() => {
            setPreviewInvoice(null);
            handleNewBillRequest();
          }}
        />
      )}

      {/* ---------------- New-bill confirmation ---------------- */}
      <AlertDialog open={confirmNewBill} onOpenChange={setConfirmNewBill}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current bill contains {pos.totals.itemCount}{" "}
              {pos.totals.itemCount === 1 ? "item" : "items"} that have not been
              saved. Starting a new bill will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStartNewBill}
              className="h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Start New Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
