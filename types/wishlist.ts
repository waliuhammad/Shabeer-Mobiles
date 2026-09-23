/**
 * Wishlist domain types.
 *
 * WHY THE WISHLIST STORES IDs, BUT THE CART STORES A SNAPSHOT
 * -----------------------------------------------------------
 * These two look similar and are deliberately different.
 *
 * A CART line is part of an order being assembled right now. It captures
 * the price AT THAT MOMENT, so the customer sees a stable total while they
 * shop. (The server still re-reads the real price before charging - see
 * lib/cart-utils.ts.)
 *
 * A WISHLIST is "show me this again later". If someone saved the iPhone 12
 * in August and opens their wishlist in November, they must see NOVEMBER's
 * price and NOVEMBER's stock - not a stale snapshot claiming Rs 28,999 for
 * something that now costs Rs 34,999 or sold out weeks ago.
 *
 * So the wishlist stores nothing but product ids and looks the rest up
 * fresh on every render. That also makes it tiny in localStorage and
 * immune to the Product interface changing shape.
 */

/** Exactly what we persist: an ordered list of product ids. */
export type WishlistIds = string[];
