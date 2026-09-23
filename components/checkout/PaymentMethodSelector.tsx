"use client";

import { Banknote, Store, Info } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/checkout-utils";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const ICONS: Record<PaymentMethod, typeof Banknote> = {
  "cash-on-delivery": Banknote,
  "pay-at-shop": Store,
};

/**
 * Payment options.
 *
 * Built on real radio inputs rather than styled divs with onClick. Radios
 * give arrow-key navigation, correct screen-reader announcements ("2 of 2
 * selected") and form semantics for free. The visible card is just a label
 * wrapped around the hidden input, so clicking anywhere on it selects.
 */
export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-1 font-heading text-lg font-bold text-primary">
        Payment Method
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        No online payment is required. Pay in cash on delivery, or at the shop.
      </p>

      <fieldset>
        <legend className="sr-only">Choose a payment method</legend>

        <div className="grid gap-3">
          {PAYMENT_METHODS.map((method) => {
            const Icon = ICONS[method.value];
            const isSelected = value === method.value;

            return (
              <label
                key={method.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors",
                  isSelected
                    ? "border-secondary bg-cyan-soft/50"
                    : "border-border hover:border-secondary/40 hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={isSelected}
                  onChange={() => onChange(method.value)}
                  className="sr-only"
                />

                <span
                  className={cn(
                    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-primary text-accent"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>

                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {method.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {method.description}
                  </span>
                </span>

                {/* The custom radio dot, mirroring the real input's state. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected ? "border-secondary" : "border-border"
                  )}
                >
                  {isSelected && <span className="size-2.5 rounded-full bg-secondary" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        Card and mobile wallet payments will be added once the payment gateway
        is connected in a later phase.
      </p>
    </div>
  );
}
