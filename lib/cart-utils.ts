import type { CartItem, CartTotals, Product } from "@/types";

/**
 * Delivery pricing. Hardcoded in Phase 1; moves to the Firestore `settings`
 * document later so the owner can change it from the admin panel.
 */
export const DELIVERY_CHARGE = 200;
export const FREE_DELIVERY_THRESHOLD = 5000;

/**
 * THE single place cart money is calculated.
 *
 * The cart page, the order summary, the header and (later) the checkout all
 * call this. Duplicating the arithmetic in each component is how a shop
 * ends up showing three different totals on three screens.
 *
 * SECURITY: these numbers are for DISPLAY ONLY. `item.price` came from the
 * customer's own localStorage, which they can edit freely. When Firebase
 * checkout lands, a Cloud Function will re-read every price from Firestore
 * by productId and recompute this server-side before charging anyone. See
 * the note in CartContext.
 */
export function calculateCartTotals(items: CartItem[]): CartTotals {
  // totalItems counts UNITS, not lines: iPhone x2 + Cover x1 = 3, not 2.
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // What the customer saved versus the pre-discount prices.
  const discount = items.reduce((sum, item) => {
    const listPrice = item.originalPrice ?? item.price;
    return sum + (listPrice - item.price) * item.quantity;
  }, 0);

  // An empty cart has no delivery charge - otherwise the summary would show
  // Rs 200 due on nothing.
  const delivery =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

  return {
    totalItems,
    subtotal,
    discount,
    delivery,
    total: subtotal + delivery,
  };
}

/**
 * Converts a full Product into the narrow snapshot the cart stores.
 *
 * Having this in one place means every entry point - the product page, the
 * card's Add to Cart, Buy Now, and later the POS - produces identically
 * shaped cart lines.
 */
export function toCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    image: product.images[0] ?? null,
    price: product.price,
    originalPrice: product.originalPrice,
    quantity,
    stock: product.stock,
  };
}
