"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ProductImage } from "@/components/products/ProductImage";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartItemRowProps {
  item: CartItem;
}

/**
 * One line of the cart.
 *
 * Note there is NO local useState for quantity here. The row writes
 * straight to the cart through updateQuantity, and re-renders from the new
 * cart state. Keeping a local copy would mean two numbers for one quantity,
 * and they would drift the first time anything else changed the cart.
 */
export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeFromCart } = useCart();

  const lineTotal = item.price * item.quantity;

  return (
    <li className="flex gap-3 border-b border-border py-4 last:border-b-0 sm:gap-4">
      <Link
        href={`/product/${item.slug}`}
        className="shrink-0"
        aria-label={`View ${item.name}`}
      >
        <ProductImage
          src={item.image}
          alt={item.name}
          sizes="112px"
          wrapperClassName="size-20 rounded-lg border border-border sm:size-24"
          iconClassName="size-5"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
              <Link href={`/product/${item.slug}`} className="hover:text-secondary">
                {item.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {formatPrice(item.price)} each
            </p>
          </div>

          <button
            type="button"
            onClick={() => removeFromCart(item.productId)}
            aria-label={`Remove ${item.name} from cart`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QuantitySelector
            value={item.quantity}
            onChange={(quantity) => updateQuantity(item.productId, quantity)}
            max={item.stock}
            // min 0: tapping minus on a quantity of 1 removes the line,
            // which is what customers expect.
            min={0}
            size="sm"
          />

          <p className="font-heading text-base font-bold text-primary sm:text-lg">
            {formatPrice(lineTotal)}
          </p>
        </div>

        {item.quantity >= item.stock && (
          <p className="text-[11px] font-medium text-warning">
            Maximum available quantity reached
          </p>
        )}
      </div>
    </li>
  );
}
