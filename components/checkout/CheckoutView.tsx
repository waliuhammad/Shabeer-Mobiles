"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { OrderReview } from "@/components/checkout/OrderReview";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCart } from "@/context/CartContext";
import { EMPTY_CHECKOUT_FORM, validateCheckoutForm } from "@/lib/checkout-utils";
import { buildMockOrder, saveOrder } from "@/lib/order-utils";
import type {
  CheckoutErrors,
  CheckoutFormData,
  CheckoutStep,
  Order,
  PaymentMethod,
} from "@/types";

/**
 * The whole checkout flow.
 *
 * THE ONE PLACE checkout state lives. The three step components below are
 * all controlled - they render what they are given and report changes
 * upward. That is what lets the Review step display the shipping details
 * without duplicating any of it.
 */
export function CheckoutView() {
  const { items, totals, clearCart, isHydrated } = useCart();

  const [step, setStep] = useState<CheckoutStep>("shipping");
  const [form, setForm] = useState<CheckoutFormData>(EMPTY_CHECKOUT_FORM);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash-on-delivery");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  /**
   * Which fields the customer has finished with.
   *
   * Without this, an error appears under "Phone" the instant they type the
   * first digit - technically correct, deeply annoying. We only show an
   * error once they have left the field, or once they press Continue.
   */
  const [touched, setTouched] = useState<Set<keyof CheckoutFormData>>(new Set());

  function handleFieldChange(field: keyof CheckoutFormData, value: string) {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    // Re-validate live, but only surface errors on fields already touched.
    if (touched.has(field)) {
      const allErrors = validateCheckoutForm(nextForm);
      setErrors(filterToTouched(allErrors, touched));
    }
  }

  function handleFieldBlur(field: keyof CheckoutFormData) {
    const nextTouched = new Set(touched).add(field);
    setTouched(nextTouched);
    setErrors(filterToTouched(validateCheckoutForm(form), nextTouched));
  }

  function handleContinueFromShipping() {
    const allErrors = validateCheckoutForm(form);

    if (Object.keys(allErrors).length > 0) {
      // Pressing Continue marks everything touched, so every problem is
      // visible at once rather than one at a time.
      const everyField = new Set(
        Object.keys(form) as (keyof CheckoutFormData)[]
      );
      setTouched(everyField);
      setErrors(allErrors);
      return;
    }

    setErrors({});
    setStep("payment");
  }

  /**
   * MOCK order placement.
   *
   * What a REAL implementation will do instead:
   *   1. send ONLY { form, paymentMethod, items: [{productId, quantity}] }
   *   2. a Cloud Function re-reads every price from Firestore by productId
   *   3. it re-checks stock inside a transaction and rejects if short
   *   4. it computes the real total server-side - never trusting ours
   *   5. it writes the order + decrements inventory atomically
   *   6. it returns the real order number
   *
   * Note what is NOT sent: prices or totals. The browser can edit those,
   * so they are worthless as input. See lib/cart-utils.ts.
   */
  function handlePlaceOrder() {
    setIsPlacing(true);

    // A short delay so the pending state is visible. A real call would be
    // genuinely async, and this is where `await placeOrder(...)` will go.
    window.setTimeout(() => {
      const order = buildMockOrder(form, items, totals, paymentMethod);

      // Persist it so the confirmation screen's "Track Order" button finds
      // something at /tracking?order=SM-XXXX. Without this the flow would
      // dead-end on a number that does not exist anywhere.
      saveOrder(order);

      setPlacedOrder(order);
      clearCart();
      setIsPlacing(false);
    }, 900);
  }

  /* ---------------- RENDER GATES ---------------- */

  // The server renders an empty cart because it cannot read localStorage.
  // Hold a neutral skeleton until the real cart has loaded, or the customer
  // sees "your cart is empty" for a frame. See CartContext.
  if (!isHydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="h-96 animate-pulse rounded-xl border border-border bg-muted/40 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    );
  }

  // Order placed: the cart is now empty, so this check must come BEFORE the
  // empty-cart guard below or the customer would be bounced off their own
  // confirmation screen.
  if (placedOrder) {
    return <OrderConfirmation order={placedOrder} />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center lg:py-24">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
          <ShoppingCart className="size-8" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          Nothing to check out
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add something to your cart before placing an order.
        </p>
        <Button
          asChild
          className="mt-2 h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/shop">
            Browse Products
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  /* ---------------- THE FLOW ---------------- */

  return (
    <>
      <CheckoutSteps current={step} />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
        <div className="space-y-4 lg:col-span-2">
          {step === "shipping" && (
            <ShippingForm
              form={form}
              errors={errors}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
            />
          )}

          {step === "payment" && (
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          )}

          {step === "review" && (
            <OrderReview
              items={items}
              form={form}
              paymentMethod={paymentMethod}
              onEdit={setStep}
            />
          )}

          {/* --- Step navigation --- */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step === "shipping" ? (
              <Button asChild variant="outline" className="h-11 px-5 font-medium">
                <Link href="/cart">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to Cart
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-5 font-medium"
                onClick={() => setStep(step === "review" ? "payment" : "shipping")}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            )}

            {step === "shipping" && (
              <Button
                type="button"
                onClick={handleContinueFromShipping}
                className="h-11 gap-2 bg-primary px-6 font-semibold text-primary-foreground hover:bg-navy-soft"
              >
                Continue to Payment
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}

            {step === "payment" && (
              <Button
                type="button"
                onClick={() => setStep("review")}
                className="h-11 gap-2 bg-primary px-6 font-semibold text-primary-foreground hover:bg-navy-soft"
              >
                Review Order
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}

            {step === "review" && (
              <Button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    Place Order
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* The SAME CartSummary the cart page uses - one component, one set
            of totals, so the two pages can never disagree. */}
        <div className="lg:sticky lg:top-28">
          <CartSummary totals={totals} showActions={false} />
        </div>
      </div>
    </>
  );
}

/** Keeps only the errors for fields the customer has already visited. */
function filterToTouched(
  allErrors: CheckoutErrors,
  touched: Set<keyof CheckoutFormData>
): CheckoutErrors {
  const visible: CheckoutErrors = {};
  for (const key of Object.keys(allErrors) as (keyof CheckoutFormData)[]) {
    if (touched.has(key)) visible[key] = allErrors[key];
  }
  return visible;
}
