/**
 * Generic, app-wide helpers. No React, no business rules.
 *
 * `cn` merges Tailwind classes safely: cn("p-2", "p-4") -> "p-4".
 * That is what lets a component accept a `className` prop and have the
 * caller reliably override the component's own defaults.
 */
export { cn } from "cn";

/**
 * Single source of truth for money display across storefront, POS and
 * reports. Integer-only: Pakistani retail pricing does not use paisa.
 */
export function formatPrice(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

/**
 * Discount badge percentage. Returns null when there is nothing to show,
 * so the UI can do `{discount !== null && <Badge/>}` with no extra logic.
 */
export function discountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
