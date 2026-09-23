"use client";

import { Minus, Plus, Trash2, ShoppingCart, AlertCircle } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import type { POSCartItem } from "@/types";

interface POSCartProps {
  items: POSCartItem[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/**
 * The bill lines.
 *
 * RESPONSIVE via CONTAINER QUERIES, not viewport ones. This lives in a
 * fixed-width side panel, so the window being 1440px wide tells us
 * nothing about whether five columns fit - the panel is 440px either
 * way. @md (448px) measures the panel itself: table when it has
 * room for five columns plus the stepper, stacked rows when it does not.
 *
 * No line shows a cost price, a margin or a profit. The cashier sees what
 * the customer is charged and nothing more.
 */
export function POSCart({ items, onQuantityChange, onRemove }: POSCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
        <ShoppingCart className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No products added</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Search for a product and add it to the bill.
        </p>
      </div>
    );
  }

  return (
    // @container: the breakpoints below measure THIS box, not the window.
    <div className="@container overflow-hidden rounded-lg border border-border">
      {/* ---------- wide panel: table ---------- */}
      <table className="hidden w-full text-sm @md:table">
        <caption className="sr-only">Items on the current bill</caption>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">Product</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Price</th>
            <th scope="col" className="px-2 py-2 text-center font-medium">Qty</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Total</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.productId}>
              <th scope="row" className="px-3 py-2.5 text-left font-normal">
                <span className="block truncate font-medium text-foreground">
                  {item.name}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {item.sku}
                </span>
                <QuantityWarning item={item} />
              </th>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatPrice(item.price)}
              </td>
              <td className="px-2 py-2.5">
                <QuantityStepper item={item} onChange={onQuantityChange} />
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-primary">
                {formatPrice(item.price * item.quantity)}
              </td>
              <td className="px-2 py-2.5 text-right">
                <RemoveButton item={item} onRemove={onRemove} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------- narrow panel: stacked rows ---------- */}
      <ul className="divide-y divide-border @md:hidden">
        {items.map((item) => (
          <li key={item.productId} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {item.sku}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatPrice(item.price)} each
                </p>
              </div>
              <RemoveButton item={item} onRemove={onRemove} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <QuantityStepper item={item} onChange={onQuantityChange} />
              <p className="font-heading text-base font-bold tabular-nums text-primary">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>

            <QuantityWarning item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --- Local pieces: used only by this file, so they stay in this file. --- */

function QuantityStepper({
  item,
  onChange,
}: {
  item: POSCartItem;
  onChange: (productId: string, quantity: number) => void;
}) {
  const atMin = item.quantity <= 1;
  const atMax = item.quantity >= item.stock;

  return (
    <div className="mx-auto inline-flex items-center rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange(item.productId, item.quantity - 1)}
        disabled={atMin}
        // Touch target stays 36px even on the dense table view - a cashier
        // is tapping fast, often on a tablet.
        aria-label={`Decrease quantity of ${item.name}`}
        className="inline-flex size-9 items-center justify-center rounded-l-lg text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>

      <span
        className="w-9 text-center text-sm font-semibold tabular-nums text-foreground"
        aria-live="polite"
      >
        {item.quantity}
      </span>

      <button
        type="button"
        onClick={() => onChange(item.productId, item.quantity + 1)}
        disabled={atMax}
        aria-label={`Increase quantity of ${item.name}`}
        className="inline-flex size-9 items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function RemoveButton({
  item,
  onRemove,
}: {
  item: POSCartItem;
  onRemove: (productId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item.productId)}
      aria-label={`Remove ${item.name} from the bill`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Shown once the line has taken everything on the shelf. */
function QuantityWarning({ item }: { item: POSCartItem }) {
  if (item.quantity < item.stock) return null;

  return (
    <span
      className={cn(
        "mt-1 flex items-center gap-1 text-[11px] font-medium text-warning"
      )}
    >
      <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
      Only {item.stock} {item.stock === 1 ? "unit" : "units"} available.
    </span>
  );
}
