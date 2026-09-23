/**
 * Checkout domain types.
 *
 * These describe what the CUSTOMER fills in. They are deliberately separate
 * from the future `Order` type, which will also carry server-computed
 * fields the browser must never supply: the real line prices, the real
 * total, the order number, the status and the timestamps.
 *
 * Keeping the two apart is what makes it obvious, later, that a checkout
 * request sends only this shape plus [{ productId, quantity }] - and that
 * everything else is calculated by trusted server code.
 */

/** Which payment option the customer picked. A union, so nothing else fits. */
export type PaymentMethod = "cash-on-delivery" | "pay-at-shop";

/** The three stages of the checkout flow. */
export type CheckoutStep = "shipping" | "payment" | "review";

/** Everything the customer types in. */
export interface CheckoutFormData {
  fullName: string;
  phone: string;
  /** Optional - many walk-in customers have no email. */
  email: string;
  address: string;
  city: string;
  /** Optional - postal codes are inconsistently used locally. */
  postalCode: string;
  /** Delivery instructions, landmarks, preferred pickup time. */
  notes: string;
}

/**
 * Validation errors, keyed by field name.
 *
 * Partial<Record<...>> means "any subset of the field names" - a field with
 * no error simply has no key, and the form can do `errors.phone && ...`.
 */
export type CheckoutErrors = Partial<Record<keyof CheckoutFormData, string>>;
