/**
 * PURCHASE COST, KEPT DELIBERATELY SEPARATE FROM THE PRODUCT.
 *
 * types/product.ts explains why `purchasePrice` is not a field on
 * Product: the moment cost lives on the product, one careless
 * getProducts() on a public page ships the shop's margins to every
 * customer's browser, and no Security Rule can undo a read that was
 * legitimate.
 *
 * So cost lives here, in its own module, keyed by product id. Phase 2
 * turns this file into a separate Firestore collection:
 *
 *     productCosts/{productId}
 *
 * with a Security Rule allowing reads only to SUPER_ADMIN and MANAGER.
 * A CASHIER's session can then never receive it, no matter what the UI
 * asks for - which is the only guarantee that actually holds.
 *
 * NOTHING in components/admin/billing/ imports this file, and nothing in
 * the storefront does either. Only the admin inventory screens do.
 *
 * The figures below are plausible demo costs, not real supplier prices.
 */
export const productCosts: Record<string, number> = {
  // Cleared. Enter each product's real purchase cost on its admin page.
  // Until a cost is set, getProductCost() returns 0, which means stock
  // value reads as zero rather than as an invented number.
};

/**
 * Cost for one product. Returns 0 when unknown rather than throwing, so
 * a product added without a cost record shows as contributing nothing to
 * inventory value instead of crashing the page.
 */
export function getProductCost(productId: string): number {
  return productCosts[productId] ?? 0;
}
