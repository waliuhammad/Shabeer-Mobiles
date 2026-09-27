import Link from "next/link";
import { Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/ProductImage";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { WishlistButton } from "@/components/products/WishlistButton";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * The props this component accepts.
 *
 * `product` is REQUIRED - no question mark, so using ProductCard without it
 * is a compile error, not a blank card discovered in the browser.
 * `className` is OPTIONAL - the caller may adjust layout without forking it.
 */
interface ProductCardProps {
  product: Product;
  className?: string;
}

/**
 * The single product presentation for the whole storefront: homepage
 * featured, homepage best sellers, shop grid, search results, category
 * pages and related products. Six surfaces, one file.
 *
 * It receives a Product through props and knows NOTHING about where it came
 * from: today data/products.ts, tomorrow a Firestore query. This file does
 * not change when that swap happens.
 *
 * A Server Component: no "use client" here. The only interactive part is
 * AddToCartButton, a client island of its own.
 */
export function ProductCard({ product, className }: ProductCardProps) {
  // Derived values - computed from props, never stored in state.
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= product.lowStockThreshold;
  const href = `/product/${product.slug}`;

  return (
    // article, not div: a product card is self-contained content.
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-secondary/40 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      {/* ---------------- IMAGE ---------------- */}
      <Link href={href} className="relative block" aria-label={`View ${product.name}`}>
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          wrapperClassName="aspect-square"
          className="transition-transform duration-300 group-hover:scale-105"
        />

        {/* NO DISCOUNT BADGE. The shop does not want a percentage on the
            card - not here in the corner, and not beside the price below,
            which is what showDiscountPercent={false} turns off. The
            struck-through old price stays: it is the comparison itself,
            not a claim made about it.

            The wrapper survives the badge because "Used" still goes here
            and still stacks, should a used handset return to the
            storefront. */}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {product.condition === "used" && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
              Used
            </span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <span className="rounded-md bg-foreground px-3 py-1 text-xs font-semibold text-background">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* OUTSIDE the Link, not inside it. A button nested in an anchor is
          invalid HTML, and clicking the heart would also navigate. */}
      {ONLINE_ORDERING_ENABLED && (
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute right-2 top-2 z-10"
        />
      )}

      {/* ---------------- DETAILS ---------------- */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          {product.brand}
        </p>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          <Link href={href} className="transition-colors hover:text-secondary">
            {product.name}
          </Link>
        </h3>

        <p className="text-[11px] text-muted-foreground">{product.categoryName}</p>

        {/* mt-auto pushes everything below to the bottom, so prices and
            buttons line up across a row even when titles wrap differently.
            No fixed heights needed. */}
        <PriceDisplay
          price={product.price}
          originalPrice={product.originalPrice}
          size="md"
          showDiscountPercent={false}
          className="mt-auto pt-1"
        />

        {outOfStock ? (
          <p className="text-[11px] font-medium text-destructive">Out of stock</p>
        ) : lowStock ? (
          <p className="flex items-center gap-1 text-[11px] font-medium text-warning">
            <Package className="size-3" aria-hidden="true" />
            Only {product.stock} left
          </p>
        ) : (
          <p className="text-[11px] font-medium text-success">In stock</p>
        )}

        {/* Stacked, not side by side: at the 2-column mobile grid a card is
            roughly 160px wide, and two buttons in a row would each be too
            small to read or tap reliably. */}
        <div className="mt-2 flex flex-col gap-2">
          {ONLINE_ORDERING_ENABLED && <AddToCartButton product={product} />}

          {/* asChild renders the Button styles onto the Link. Without it you
              get an anchor wrapping a button, which is invalid HTML and
              breaks keyboard navigation.

              With ordering off this is the card's only action, so it takes
              the accent styling that Add to Cart had - a card whose single
              button is a muted outline reads as disabled. */}
          <Button
            asChild
            variant={ONLINE_ORDERING_ENABLED ? "outline" : "default"}
            className={cn(
              "h-9 w-full gap-1.5 font-medium",
              !ONLINE_ORDERING_ENABLED &&
                "bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
            )}
          >
            <Link href={href}>
              <Eye className="size-3.5" aria-hidden="true" />
              View Product
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
