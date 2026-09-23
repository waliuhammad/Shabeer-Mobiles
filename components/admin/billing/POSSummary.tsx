"use client";

import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/pos-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { POSPaymentMethod, POSTotals } from "@/types";

interface POSSummaryProps {
  totals: POSTotals;
  /** Raw typed values, so we can flag input the clamp already corrected. */
  discountInput: number;
  paidInput: number;
  paymentMethod: POSPaymentMethod;
  onDiscountChange: (value: number) => void;
  onPaidChange: (value: number) => void;
  onPaymentMethodChange: (method: POSPaymentMethod) => void;
}

const PAYMENT_METHODS: POSPaymentMethod[] = ["cash", "card", "bank-transfer", "other"];

/**
 * Totals + discount + payment.
 *
 * It performs NO arithmetic. Every figure arrives in `totals`, already
 * computed by calculatePOSTotals(). If this panel added up the lines
 * itself, the bill and the printed invoice could disagree - which on a
 * till means charging the wrong amount.
 *
 * The distinction between `totals.discount` and `discountInput` matters:
 * the first is what will be applied (clamped), the second is what the
 * cashier typed. Showing both is how we can say "that is more than the
 * subtotal" instead of silently changing their number.
 */
export function POSSummary({
  totals,
  discountInput,
  paidInput,
  paymentMethod,
  onDiscountChange,
  onPaidChange,
  onPaymentMethodChange,
}: POSSummaryProps) {
  const status = PAYMENT_STATUS_STYLES[totals.paymentStatus];

  const discountTooHigh = discountInput > totals.subtotal;
  const paidTooHigh = paidInput > totals.total;

  /** "" clears to 0 rather than becoming NaN. */
  const toNumber = (raw: string) => {
    if (raw.trim() === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="space-y-3">
      {/* ---------- Discount & Paid ---------- */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="pos-discount"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Discount (Rs)
          </label>
          <input
            id="pos-discount"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={discountInput === 0 ? "" : discountInput}
            onChange={(e) => onDiscountChange(toNumber(e.target.value))}
            placeholder="0"
            aria-invalid={discountTooHigh || undefined}
            className={cn(
              "h-10 w-full rounded-lg border bg-background px-3 text-sm tabular-nums outline-none transition-colors",
              discountTooHigh
                ? "border-destructive focus:ring-2 focus:ring-destructive/25"
                : "border-border focus:border-secondary focus:ring-2 focus:ring-ring/30"
            )}
          />
        </div>

        <div>
          <label
            htmlFor="pos-paid"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Paid Amount (Rs)
          </label>
          <input
            id="pos-paid"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={paidInput === 0 ? "" : paidInput}
            onChange={(e) => onPaidChange(toNumber(e.target.value))}
            placeholder="0"
            aria-invalid={paidTooHigh || undefined}
            className={cn(
              "h-10 w-full rounded-lg border bg-background px-3 text-sm tabular-nums outline-none transition-colors",
              paidTooHigh
                ? "border-destructive focus:ring-2 focus:ring-destructive/25"
                : "border-border focus:border-secondary focus:ring-2 focus:ring-ring/30"
            )}
          />
        </div>
      </div>

      {(discountTooHigh || paidTooHigh) && (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs font-medium text-destructive"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {discountTooHigh
            ? `Discount cannot be more than the subtotal (${formatPrice(totals.subtotal)}).`
            : `Paid amount cannot be more than the total (${formatPrice(totals.total)}).`}
        </p>
      )}

      {/* Quick-fill: the commonest action at a counter is "paid in full". */}
      {totals.total > 0 && totals.paidAmount < totals.total && (
        <button
          type="button"
          onClick={() => onPaidChange(totals.total)}
          className="w-full rounded-lg border border-dashed border-secondary/50 py-2 text-xs font-medium text-secondary transition-colors hover:bg-cyan-soft"
        >
          Mark paid in full &middot; {formatPrice(totals.total)}
        </button>
      )}

      {/* ---------- Payment method ---------- */}
      <div>
        <label
          htmlFor="pos-payment-method"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Payment Method
        </label>
        <Select
          value={paymentMethod}
          onValueChange={(v) => onPaymentMethodChange(v as POSPaymentMethod)}
        >
          <SelectTrigger id="pos-payment-method" className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---------- Totals ---------- */}
      <dl className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
          </dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatPrice(totals.subtotal)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="font-medium tabular-nums text-success">
            {totals.discount > 0 ? `- ${formatPrice(totals.discount)}` : formatPrice(0)}
          </dd>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="font-heading text-base font-bold text-primary">Total</dt>
          <dd className="font-heading text-lg font-bold tabular-nums text-primary">
            {formatPrice(totals.total)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatPrice(totals.paidAmount)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Due</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              totals.dueAmount > 0 ? "text-destructive" : "text-success"
            )}
          >
            {formatPrice(totals.dueAmount)}
          </dd>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            {/* Derived from the numbers above - never set by hand. */}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                status.className
              )}
            >
              {status.label}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
