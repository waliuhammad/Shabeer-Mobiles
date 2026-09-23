import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import type { CheckoutErrors, CheckoutFormData, PaymentMethod } from "@/types";

/** A blank form. Every field starts as "" so all inputs stay controlled. */
export const EMPTY_CHECKOUT_FORM: CheckoutFormData = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  city: "Multan",
  postalCode: "",
  notes: "",
};

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "cash-on-delivery",
    label: "Cash on Delivery",
    description: "Pay the rider in cash when your order arrives.",
  },
  {
    value: "pay-at-shop",
    label: "Payment at Shop",
    description: "Reserve online and pay when you collect from the shop.",
  },
];

/**
 * Validates the shipping details.
 *
 * Pure and synchronous, so the form can call it on submit AND on blur
 * without any duplicated rules.
 *
 * IMPORTANT: this is CONVENIENCE validation. It tells an honest customer
 * they mistyped their phone number. It stops nobody - anyone can disable
 * JavaScript or POST directly. When the real order endpoint exists, a Cloud
 * Function must run its own validation server-side before writing anything.
 * Client validation is a nicety; server validation is the actual rule.
 */
export function validateCheckoutForm(form: CheckoutFormData): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (form.fullName.trim().length < 3) {
    errors.fullName = "Please enter your full name.";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone number is required - we call to confirm every order.";
  } else if (!isValidPakistaniPhone(form.phone)) {
    errors.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
  }

  // Optional, but if it is filled in it has to be plausible.
  if (form.email.trim() && !isValidEmail(form.email.trim())) {
    errors.email = "That email address does not look right.";
  }

  if (form.address.trim().length < 10) {
    errors.address = "Please include house/shop number, street and area.";
  }

  if (!form.city.trim()) {
    errors.city = "City is required.";
  }

  return errors;
}

/** True when validateCheckoutForm found nothing to complain about. */
export function isCheckoutFormValid(form: CheckoutFormData): boolean {
  return Object.keys(validateCheckoutForm(form)).length === 0;
}
