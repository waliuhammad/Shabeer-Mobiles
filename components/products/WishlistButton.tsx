"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  /** Used in the accessible label so the button says what it acts on. */
  productName: string;
  /** "icon" floats over a product image; "inline" sits in a row of buttons. */
  variant?: "icon" | "inline";
  className?: string;
}

/**
 * The save-to-wishlist heart.
 *
 * A tiny client island so ProductCard and ProductInfo can stay Server
 * Components. Both render this; neither knows how the wishlist is stored.
 */
export function WishlistButton({
  productId,
  productName,
  variant = "icon",
  className,
}: WishlistButtonProps) {
  const { isSaved, toggle, isHydrated } = useWishlist();

  // Before hydration the server rendered an empty heart, so the client must
  // too - otherwise React reports a mismatch. See CartContext for the full
  // explanation of why isHydrated exists.
  const saved = isHydrated && isSaved(productId);

  const label = saved
    ? `Remove ${productName} from wishlist`
    : `Save ${productName} to wishlist`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-colors",
          saved
            ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "border-border bg-card text-primary hover:bg-muted",
          className
        )}
      >
        <Heart
          className={cn("size-4", saved && "fill-current")}
          aria-hidden="true"
        />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-[1px] transition-colors hover:bg-background",
        saved ? "text-destructive" : "text-muted-foreground hover:text-destructive",
        className
      )}
    >
      <Heart className={cn("size-4", saved && "fill-current")} aria-hidden="true" />
    </button>
  );
}
