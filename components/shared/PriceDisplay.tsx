import { cn, formatPrice, discountPercent } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { now: "text-sm", was: "text-xs" },
  md: { now: "text-base sm:text-lg", was: "text-xs sm:text-sm" },
  lg: { now: "text-2xl sm:text-3xl", was: "text-sm sm:text-base" },
} as const;

/**
 * The strike-through + discount pattern, written once. Prices appear on the
 * card, the product page, the cart, checkout, the POS and receipts.
 */
export function PriceDisplay({
  price,
  originalPrice,
  size = "md",
  className,
}: PriceDisplayProps) {
  const discount = discountPercent(price, originalPrice);
  const s = SIZES[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-heading font-bold text-primary", s.now)}>
        {formatPrice(price)}
      </span>

      {discount !== null && originalPrice !== undefined && (
        <>
          <span className={cn("text-muted-foreground line-through", s.was)}>
            {formatPrice(originalPrice)}
          </span>
          <span className={cn("font-semibold text-success", s.was)}>{discount}% OFF</span>
        </>
      )}
    </div>
  );
}
