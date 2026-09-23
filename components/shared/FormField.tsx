"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  /** The form's value for this field. Always a string - see "controlled". */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Message to show under the field. Undefined means "no error". */
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  /** Lets the browser offer saved values. A real UX win on mobile. */
  autoComplete?: string;
  textarea?: boolean;
  rows?: number;
  className?: string;
}

/**
 * One labelled, validated form field - used by checkout, login, register
 * and contact.
 *
 * WHY A SHARED FIELD RATHER THAN HAND-WRITTEN INPUTS:
 * every field needs a real <label>, an id linking it to that label, an
 * error slot, aria-invalid, and aria-describedby pointing at the error.
 * That is five things to get right, times roughly twenty fields across the
 * site. Written once here, every field is correct by construction.
 *
 * ACCESSIBILITY, specifically:
 *  - a real <label htmlFor> - NOT placeholder-as-label. A placeholder
 *    vanishes the moment you type, so anyone who forgets what a field was
 *    for has to clear it to find out, and screen readers may skip it.
 *  - useId() generates a collision-proof id, so the same field can appear
 *    twice on one page without breaking the label link.
 *  - role="alert" makes the error announced the instant it appears.
 */
export function FormField({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  required,
  autoComplete,
  textarea,
  rows = 4,
  className,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onBlur,
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>

      {textarea ? (
        <textarea {...shared} rows={rows} className={cn(shared.className, "resize-y")} />
      ) : (
        <input {...shared} type={type} />
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
