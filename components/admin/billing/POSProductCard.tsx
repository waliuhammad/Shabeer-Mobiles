"use client";

import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/ProductImage";
import { getProductStockLevel, STOCK_LEVEL_STYLES, IN_STOCK_STYLE } from "@/lib/stock";
import { formatPrice, cn } from "@/lib/utils";
import type { Product } from "@/types";

interface POSProductCardProps {
  product: Product;
  /** How many are already on the current bill. */
  billedQuantity: number;
  onAdd: (product: Product) => void;
}

/**
 * One product in the POS lookup list.
 *
 * NOT the storefront's ProductCard. That one sells: discounts, "Used"
 * badges, wishlist heart, View Product link, a big square image. A
 * cashier needs none of that and needs density instead - the facts that
 * decide a sale, in one scannable row.
 *
 * It does reuse ProductImage, so the placeholder behaviour is identical.
 *
 * WHAT IS DELIBERATELY NOT SHOWN: purchase price. It is not even on the
 * Product type, so it cannot leak here. See types/product.ts.
 */
export function POSProductCard({
  product,
  billedQuantity,
  onAdd,
}: POSProductCardProps) {
  // The ONE stock rule, shared with the storefront and the dashboard.
  const level = getProductStockLevel(product);
  const style = level ? STOCK_LEVEL_STYLES[level] : IN_STOCK_STYLE;

  const outOfStock = product.stock <= 0;
  // Everything on the shelf is already on the bill - adding more would
  // oversell, so the button stops here too.
  const exhausted = !outOfStock && billedQuantity >= product.stock;
  const disabled = outOfStock || exhausted;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors",
        disabled ? "opacity-60" : "hover:border-secondary/50"
      )}
    >
      <ProductImage
        src={product.images[0]}
        alt={product.name}
        sizes="56px"
        wrapperClassName="size-12 shrink-0 rounded-md border border-border"
        iconClassName="size-4"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {product.name}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {product.sku}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-heading text-sm font-bold tabular-nums text-primary">
            {formatPrice(product.price)}
          </span>
          {/* Status label always accompanies the colour. */}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              style.badgeClass
            )}
          >
            {style.label}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {product.stock} {product.stock === 1 ? "unit" : "units"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Button
          type="button"
          size="sm"
          onClick={() => onAdd(product)}
          disabled={disabled}
          aria-label={
            outOfStock
              ? `${product.name} is out of stock`
              : exhausted
                ? `All ${product.stock} units of ${product.name} are already on the bill`
                : `Add ${product.name} to the bill`
          }
          className="h-9 gap-1 bg-accent px-3 font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>

        {billedQuantity > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-success">
            <Check className="size-3" aria-hidden="true" />
            {billedQuantity} on bill
          </span>
        )}
      </div>
    </div>
  );
}
