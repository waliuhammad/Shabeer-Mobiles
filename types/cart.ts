/**
 * Cart domain types.
 *
 * WHY A CartItem IS NOT JUST A Product + quantity
 * ------------------------------------------------
 * It would be tempting to write `{ product: Product; quantity: number }`.
 * We store a deliberate SNAPSHOT of only the fields the cart needs instead,
 * for three reasons:
 *
 * 1. SIZE. This object is serialised into localStorage on every change. A
 *    full Product carries description, features and a whole gallery - none
 *    of which the cart renders. Multiply by ten lines and you are writing
 *    kilobytes of dead weight on every click.
 *
 * 2. SHAPE STABILITY. When Product gains fields later (warrantyMonths,
 *    supplierId, imeiNumbers), a stored cart from last week would suddenly
 *    hold objects that no longer match the Product interface. A narrow
 *    snapshot only breaks if one of these seven fields changes.
 *
 * 3. LEAKAGE. A Product could one day carry admin-only data. Anything put
 *    in a CartItem is written to the customer's own browser storage in
 *    plain text, so the cart should carry the minimum needed to render.
 *
 * The snapshot is display data ONLY. See lib/cart-utils.ts for why the
 * price stored here can never be trusted to charge the customer.
 */
export interface CartItem {
  /** Links back to the real product. The only field a server would trust. */
  productId: string;
  /** Snapshot, for the cart row and the link. */
  name: string;
  slug: string;
  image: string | null;
  /** Selling price AT THE TIME OF ADDING. Display only. */
  price: number;
  /** List price at the time of adding, so the cart can show the saving. */
  originalPrice?: number;
  quantity: number;
  /** Stock known at the time of adding - caps the quantity selector. */
  stock: number;
}

/** Everything the order summary needs, computed in one place. */
export interface CartTotals {
  /** Sum of every line's quantity. iPhone x2 + Cover x1 = 3. */
  totalItems: number;
  /** Sum of price * quantity across all lines. */
  subtotal: number;
  /** Total saving versus the original prices. */
  discount: number;
  /** Delivery charge for this order. */
  delivery: number;
  /** subtotal + delivery. */
  total: number;
}
