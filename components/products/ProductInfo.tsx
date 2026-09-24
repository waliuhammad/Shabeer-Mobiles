import { Check, Package, Truck, ShieldCheck, Store, Phone } from "lucide-react";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { ProductActions } from "@/components/products/ProductActions";
import { CounterOnlyNotice } from "@/components/products/CounterOnlyNotice";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
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

  /**
   * NO RATING IS SHOWN, because there is nothing to show.
   *
   * This block used to read `const rating = 4.5; const reviewCount = 24;`
   * and render four and a half gold stars on EVERY product - the same
   * score, the same count, on a shop that has never collected a single
   * review. That is invented social proof on a real business's website:
   * a customer reads it as other people's experience of this exact
   * phone, and it is a number somebody typed.
   *
   * The Reviews tab already says reviews are coming, and explains that
   * they will be writable only by a customer who actually bought the
   * item. When that exists, the average belongs here - computed, not
   * declared.
   */

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

      {/* --- How to actually get it ---

          The branch is HERE, not inside ProductActions, because the two
          sides are different kinds of component. ProductActions is a
          client island built around the cart; CounterOnlyNotice is
          static server-rendered HTML. Choosing between them at the call
          site means that with ordering off, the cart island is never
          imported into the page and none of its JavaScript is sent. */}
      {ONLINE_ORDERING_ENABLED ? (
        <ProductActions product={product} />
      ) : (
        <CounterOnlyNotice product={product} />
      )}

      {/* --- Trust strip --- */}
      <ul className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-3">
        {[
          { Icon: ShieldCheck, label: "Checked before handover" },
          // Delivery is an ONLINE-ORDER promise. With ordering off there
          // is no way to request it from this site and nothing that
          // records the address, so promising it here would be a claim
          // the shop cannot act on.
          ...(ONLINE_ORDERING_ENABLED
            ? [{ Icon: Truck, label: "City-wide delivery" }]
            : [{ Icon: Phone, label: "Call to reserve" }]),
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
