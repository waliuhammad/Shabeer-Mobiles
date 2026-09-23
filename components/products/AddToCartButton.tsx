"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  className?: string;
}

/**
 * The one-tap Add to Cart on a product card.
 *
 * A client island inside ProductCard, which is otherwise a Server
 * Component. Rendering eleven cards therefore ships eleven buttons' worth
 * of JavaScript, not eleven cards' worth.
 *
 * The product page uses ProductActions instead, because it also needs a
 * quantity selector and Buy Now. Both call the SAME addToCart from
 * CartContext, so the merge-duplicates and stock-cap rules are identical.
 */
export function AddToCartButton({
  product,
  quantity = 1,
  className,
}: AddToCartButtonProps) {
  const { addToCart, getItemQuantity, isHydrated } = useCart();
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;
  // Only meaningful once the saved cart has loaded; before that it reads 0,
  // which matches what the server rendered.
  const inCart = getItemQuantity(product.id);
  const atStockLimit = isHydrated && !outOfStock && inCart >= product.stock;

  function handleClick() {
    if (outOfStock || atStockLimit) return;
    addToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  const label = outOfStock
    ? "Out of Stock"
    : atStockLimit
      ? "Max in Cart"
      : "Add to Cart";

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={outOfStock || atStockLimit}
      aria-label={
        outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`
      }
      className={cn(
        "h-10 w-full gap-1.5 font-semibold",
        added
          ? "bg-success text-white hover:bg-success"
          : "bg-accent text-accent-foreground hover:bg-gold-deep",
        className
      )}
    >
      {added ? (
        <>
          <Check className="size-4" aria-hidden="true" /> Added
        </>
      ) : (
        <>
          <ShoppingCart className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}
