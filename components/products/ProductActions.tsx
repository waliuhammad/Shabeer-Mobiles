"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { WishlistButton } from "@/components/products/WishlistButton";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

interface ProductActionsProps {
  product: Product;
}

/**
 * Quantity + Add to Cart + Buy Now.
 *
 * This is the one client island on the product detail page. Everything
 * around it - breadcrumbs, description, specifications - stays on the
 * server and ships no JavaScript.
 */
export function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const { addToCart, getItemQuantity } = useCart();

  // Local state, used only until the customer commits by pressing a button.
  // It belongs here rather than in the cart: a quantity the user is still
  // adjusting is not yet part of their order.
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;

  // How many are already in the cart, so we can cap what is addable now.
  const inCart = getItemQuantity(product.id);
  const remaining = Math.max(0, product.stock - inCart);
  const atStockLimit = !outOfStock && remaining === 0;

  function handleAddToCart() {
    if (outOfStock || atStockLimit) return;
    addToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  /**
   * Buy Now is NOT a separate purchase path. It calls the exact same
   * addToCart, then navigates to the cart.
   *
   * A parallel "instant buy" system would mean a second set of stock
   * checks, a second total calculation and a second checkout - two code
   * paths that drift and two places every future bug has to be fixed.
   * One cart, one set of rules.
   */
  function handleBuyNow() {
    if (outOfStock || atStockLimit) return;
    addToCart(product, quantity);
    router.push("/cart");
  }

  return (
    <div className="space-y-4">
      {!outOfStock && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            // Cannot select more than is still available after what is
            // already sitting in the cart.
            max={Math.max(1, remaining)}
            min={1}
          />
          <span className="text-xs text-muted-foreground">
            {product.stock} available
            {inCart > 0 && ` - ${inCart} already in cart`}
          </span>
        </div>
      )}

      {atStockLimit && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          You already have all {product.stock} available units in your cart.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock || atStockLimit}
          className={
            added
              ? "h-12 flex-1 gap-2 bg-success font-semibold text-white hover:bg-success"
              : "h-12 flex-1 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
          }
        >
          {added ? (
            <>
              <Check className="size-4" aria-hidden="true" /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" aria-hidden="true" />
              {outOfStock ? "Out of Stock" : "Add to Cart"}
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock || atStockLimit}
          className="h-12 flex-1 gap-2 bg-primary font-semibold text-primary-foreground hover:bg-navy-soft"
        >
          <Zap className="size-4" aria-hidden="true" />
          Buy Now
        </Button>

        {/* Always enabled - saving something that is out of stock is
            exactly when a wishlist is most useful. */}
        <WishlistButton
          productId={product.id}
          productName={product.name}
          variant="inline"
        />
      </div>
    </div>
  );
}
