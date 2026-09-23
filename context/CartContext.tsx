"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { calculateCartTotals, toCartItem } from "@/lib/cart-utils";
import type { CartItem, CartTotals, Product } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:cart:v1";

/**
 * What any component inside the provider can read and call.
 *
 * Note that nothing here mentions localStorage. That is the point: a
 * component calls addToCart() and does not care whether the cart lives in
 * browser storage today or Firestore tomorrow. Only this file changes when
 * the storage swaps.
 */
interface CartContextValue {
  items: CartItem[];
  totals: CartTotals;
  /** Adds, or increases the quantity if the product is already in the cart. */
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /** How many of this product are already in the cart. */
  getItemQuantity: (productId: string) => number;
  /**
   * False on the server and during hydration, true from the first
   * browser-only render onward. Components that would otherwise print a
   * server/client mismatch (the header badge) wait for this.
   */
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Reads the saved cart. Every access is wrapped because localStorage can
 * throw: private browsing, blocked site data and quota errors are all real.
 * A cart that crashes the app when storage is unavailable is worse than a
 * cart that starts empty.
 */
function readStoredCart(): CartItem[] {
  // The server has no `window`. Touching localStorage there throws.
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything could be in storage - the customer can edit it by hand.
    // Keep only entries that still look like cart lines.
    return parsed.filter(
      (entry): entry is CartItem =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as CartItem).productId === "string" &&
        typeof (entry as CartItem).quantity === "number"
    );
  } catch {
    return [];
  }
}

/**
 * Holds the cart for the whole application.
 *
 * Mounted in app/layout.tsx, above every route, so the Header, the product
 * pages and the cart page all read and write ONE cart.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  /**
   * A LAZY INITIALISER: the arrow function runs once, on the first render,
   * instead of on every render. On the server it returns [] (no window);
   * in the browser it returns the saved cart immediately - no effect, no
   * loading flash, no second render.
   *
   * This DOES mean the first browser render holds 3 items while the server
   * HTML showed 0. That is safe only because every component that displays
   * cart data gates on isHydrated, so the hydration render produces exactly
   * the markup the server sent. Add a new cart-reading component and it
   * must respect that rule too.
   */
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  const isHydrated = useIsHydrated();

  /* ---------------- SAVE ON EVERY CHANGE ----------------
     This is what an effect is actually for: pushing React state out to an
     external system. It does not call setState, so it cannot cascade. */
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked. The in-memory cart still works for this
      // session; it simply will not survive a refresh.
    }
  }, [items]);

  /**
   * Add, or increase the quantity if already present.
   *
   * The stock cap is applied HERE rather than in the button, so every entry
   * point - product page, card, Buy Now - is capped the same way.
   */
  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        // Already in the cart: bump the line, never create a duplicate.
        const nextQuantity = Math.min(existing.quantity + quantity, product.stock);
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQuantity } : item
        );
      }

      if (product.stock <= 0) return current;
      return [...current, toCartItem(product, Math.min(quantity, product.stock))];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) => {
      // Dropping to zero removes the line - the expected behaviour when a
      // customer taps minus on a quantity of one.
      if (quantity <= 0) {
        return current.filter((item) => item.productId !== productId);
      }
      return current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const getItemQuantity = useCallback(
    (productId: string) =>
      items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items]
  );

  // Derived, not state: recomputed whenever items change, so the totals can
  // never disagree with the lines they came from.
  const totals = useMemo(() => calculateCartTotals(items), [items]);

  const value = useMemo(
    () => ({
      items,
      totals,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getItemQuantity,
      isHydrated,
    }),
    [
      items,
      totals,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getItemQuantity,
      isHydrated,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * The only way components touch the cart.
 *
 * Throwing on a missing provider turns a silent "why is my cart always
 * empty" into an immediate, named error that points at the real cause.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a <CartProvider>");
  }
  return context;
}
