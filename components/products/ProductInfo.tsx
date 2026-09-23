import { Star, Check, Package, Truck, ShieldCheck, Store } from "lucide-react";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { ProductActions } from "@/components/products/ProductActions";
import type { Product } from "@/types";

interface ProductInfoProps {
  product: Product;
}

/**
 * Everything to the right of the gallery on desktop, and everything below
 * the image on mobile.
 *
 * A Server Component. Only the nested ProductActions is a client island -
 * the name, price, rating and feature list are static HTML.
 */
export function ProductInfo({ product }: ProductInfoProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= product.lowStockThreshold;

  // Placeholder ratings. Real reviews arrive with the Firestore `reviews`
  // collection in a later phase; hardcoding the shape now means the layout
  // is already correct when real numbers replace these.
  const rating = 4.5;
  const reviewCount = 24;

  return (
    <div className="flex flex-col gap-5">
      {/* --- Title block --- */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {product.brand}
          </span>
          {product.condition === "used" && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              Used
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight text-primary sm:text-3xl">
          {product.name}
        </h1>

        {/* --- Rating --- */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={
                  star <= Math.round(rating)
                    ? "size-4 fill-accent text-accent"
                    : "size-4 text-border"
                }
              />
            ))}
          </div>
          <span className="text-sm font-medium text-foreground">{rating}</span>
          <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
        </div>
      </div>

      {/* --- Price --- */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <PriceDisplay
          price={product.price}
          originalPrice={product.originalPrice}
          size="lg"
        />

        <p className="mt-2 text-sm">
          {outOfStock ? (
            <span className="font-medium text-destructive">Out of Stock</span>
          ) : lowStock ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-warning">
              <Package className="size-4" aria-hidden="true" />
              Low stock - only {product.stock} left
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check className="size-4" aria-hidden="true" />
              In Stock ({product.stock} available)
            </span>
          )}
        </p>
      </div>

      {/* --- Key features --- */}
      {product.features.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Key Features
          </h2>
          <ul className="space-y-2">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Quantity + Add to Cart + Buy Now (client island) --- */}
      <ProductActions product={product} />

      {/* --- Trust strip --- */}
      <ul className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-3">
        {[
          { Icon: ShieldCheck, label: "Checked before handover" },
          { Icon: Truck, label: "City-wide delivery" },
          { Icon: Store, label: "Collect from the shop" },
        ].map(({ Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
