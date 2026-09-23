"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  /** Current quantity. This component does NOT own it - see the note below. */
  value: number;
  /** Reports the new quantity upward. */
  onChange: (quantity: number) => void;
  /** Upper bound, normally the product's stock. */
  max: number;
  /** Lower bound. 1 on a product page; 0 in a cart row means "remove". */
  min?: number;
  size?: "sm" | "md";
  className?: string;
}

/**
 * A CONTROLLED component: it holds no useState of its own.
 *
 * Why not? Because two different parents need to own the number for
 * different reasons:
 *   - the product page keeps it in local state, then passes it to Add to Cart
 *   - a cart row has no local state at all; it writes straight to the cart
 *
 * If this component owned the value, the cart row would have two copies of
 * the quantity (one here, one in the cart) which would drift apart. Owning
 * the value one level up keeps a single source of truth in both cases.
 *
 * "use client" is required: onClick handlers only exist in the browser.
 */
export function QuantitySelector({
  value,
  onChange,
  max,
  min = 1,
  size = "md",
  className,
}: QuantitySelectorProps) {
  // Clamping lives here so no caller can push the value out of range.
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  const atMin = value <= min;
  const atMax = value >= max;

  const buttonSize = size === "sm" ? "size-8" : "size-10";
  const labelSize = size === "sm" ? "w-9 text-sm" : "w-12 text-base";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card",
        className
      )}
    >
      <button
        type="button"
        onClick={decrease}
        disabled={atMin}
        aria-label="Decrease quantity"
        className={cn(
          "inline-flex items-center justify-center rounded-l-lg text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent",
          buttonSize
        )}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      {/* aria-live so screen readers announce the new number after a tap. */}
      <span
        className={cn(
          "text-center font-semibold tabular-nums text-foreground",
          labelSize
        )}
        aria-live="polite"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={increase}
        disabled={atMax}
        aria-label="Increase quantity"
        className={cn(
          "inline-flex items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent",
          buttonSize
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
