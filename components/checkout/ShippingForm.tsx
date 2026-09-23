"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckoutErrors, CheckoutFormData } from "@/types";

interface ShippingFormProps {
  form: CheckoutFormData;
  errors: CheckoutErrors;
  /** Reports a single field change upward. The PARENT owns the form state. */
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBlur: (field: keyof CheckoutFormData) => void;
}

interface FieldConfig {
  name: keyof CheckoutFormData;
  label: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  /** Lets the browser offer saved values. Real UX win on mobile. */
  autoComplete?: string;
  /** Full width on desktop instead of half. */
  wide?: boolean;
  textarea?: boolean;
}

/**
 * Driven by a config array rather than eight hand-written blocks of JSX.
 * Adding a field is one object; the label, error slot, ARIA wiring and
 * styling come for free and stay identical across every field.
 */
const FIELDS: FieldConfig[] = [
  {
    name: "fullName",
    label: "Full Name",
    placeholder: "Muhammad Ahmed",
    required: true,
    autoComplete: "name",
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "tel",
    placeholder: "0300 1234567",
    required: true,
    autoComplete: "tel",
  },
  {
    name: "email",
    label: "Email (optional)",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Multan",
    required: true,
    autoComplete: "address-level2",
  },
  {
    name: "address",
    label: "Delivery Address",
    placeholder: "House / shop number, street, area",
    required: true,
    autoComplete: "street-address",
    wide: true,
    textarea: true,
  },
  {
    name: "postalCode",
    label: "Postal Code (optional)",
    placeholder: "60000",
    autoComplete: "postal-code",
  },
  {
    name: "notes",
    label: "Order Notes (optional)",
    placeholder: "Nearest landmark, or a preferred delivery time",
    wide: true,
    textarea: true,
  },
];

export function ShippingForm({ form, errors, onChange, onBlur }: ShippingFormProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-1 font-heading text-lg font-bold text-primary">
        Customer Information
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        We call every customer to confirm the order before dispatch.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const error = errors[field.name];
          const inputId = `checkout-${field.name}`;
          const errorId = `${inputId}-error`;

          const sharedProps = {
            id: inputId,
            name: field.name,
            value: form[field.name],
            placeholder: field.placeholder,
            autoComplete: field.autoComplete,
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => onChange(field.name, e.target.value),
            onBlur: () => onBlur(field.name),
            // Announces the invalid state, and links the input to its
            // message so a screen reader reads the reason, not just "invalid".
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? errorId : undefined,
            className: cn(
              "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground",
              error
                ? "border-destructive focus:ring-2 focus:ring-destructive/25"
                : "border-border focus:border-secondary focus:ring-2 focus:ring-ring/30"
            ),
          };

          return (
            <div
              key={field.name}
              className={cn("flex flex-col gap-1.5", field.wide && "sm:col-span-2")}
            >
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
                {field.required && (
                  <span className="text-destructive" aria-hidden="true">
                    {" "}
                    *
                  </span>
                )}
              </label>

              {field.textarea ? (
                <textarea {...sharedProps} rows={3} className={cn(sharedProps.className, "resize-y")} />
              ) : (
                <input {...sharedProps} type={field.type ?? "text"} />
              )}

              {error && (
                <p
                  id={errorId}
                  // role="alert" makes screen readers announce it the moment
                  // it appears, without the customer having to hunt for it.
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
