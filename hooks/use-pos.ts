"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import {
  calculatePOSTotals,
  formatInvoiceNumber,
  productToPOSItem,
} from "@/lib/pos-utils";
import { WALK_IN_CUSTOMER_ID } from "@/types";
import type {
  POSPaymentMethod,
  POSCartItem,
  Product,
} from "@/types";

/**
 * The bill currently being typed.
 *
 * A useReducer rather than six useStates, for one concrete reason: "New
 * Bill" has to reset items, discount, paid amount, payment method, the
 * customer AND the invoice number together, atomically. Six separate
 * setters is six chances to forget one - and a forgotten discount carried
 * into the next customer's bill is a real money bug.
 *
 * One RESET action, one correct outcome.
 */
interface POSState {
  invoiceNumber: string;
  /** Central customer id. Defaults to the stable walk-in record. */
  customerId: string;
  items: POSCartItem[];
  /** What the cashier TYPED. The clamped value comes from the totals. */
  discount: number;
  /** Likewise - raw input, so we can tell them it is too high. */
  paidAmount: number;
  paymentMethod: POSPaymentMethod;
}

type POSAction =
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "SET_CUSTOMER"; customerId: string }
  | { type: "SET_DISCOUNT"; discount: number }
  | { type: "SET_PAID"; paidAmount: number }
  | { type: "SET_PAYMENT_METHOD"; method: POSPaymentMethod }
  | { type: "RESET"; invoiceNumber: string };

function createInitialState(invoiceNumber: string): POSState {
  return {
    invoiceNumber,
    customerId: WALK_IN_CUSTOMER_ID,
    items: [],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "cash",
  };
}

function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case "ADD_PRODUCT": {
      const { product } = action;
      if (product.stock <= 0) return state;

      const existing = state.items.find((i) => i.productId === product.id);

      if (existing) {
        // Already on the bill: bump the line, never add a second row.
        // Capped at stock so repeated clicking cannot oversell.
        const nextQuantity = Math.min(existing.quantity + 1, product.stock);
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: nextQuantity }
              : item
          ),
        };
      }

      // New lines go to the TOP: the cashier's attention is on what they
      // just scanned, and a long bill would otherwise push it off-screen.
      return {
        ...state,
        items: [productToPOSItem(product), ...state.items],
      };
    }

    case "SET_QUANTITY": {
      // Clamped here, in the reducer, so no caller can push a line out of
      // range - not the stepper, not a future barcode scanner.
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? {
                ...item,
                quantity: Math.min(Math.max(1, action.quantity), item.stock),
              }
            : item
        ),
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.productId !== action.productId),
      };

    case "SET_CUSTOMER":
      return { ...state, customerId: action.customerId };

    case "SET_DISCOUNT":
      return { ...state, discount: Math.max(0, action.discount) };

    case "SET_PAID":
      return { ...state, paidAmount: Math.max(0, action.paidAmount) };

    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.method };

    case "RESET":
      return createInitialState(action.invoiceNumber);

    default:
      return state;
  }
}

/**
 * Drives the till.
 *
 * DELIBERATELY NOT the storefront's CartContext. They look similar and
 * serve different businesses: a shopper's cart persists across sessions,
 * belongs to one person, and survives a refresh. A bill is transient,
 * belongs to whoever is standing at the counter, and MUST NOT survive -
 * yesterday's half-finished bill reappearing for today's customer would
 * be a genuine problem.
 *
 * It is also not stored in localStorage for the same reason.
 */
export function usePOS(startingSequence: number) {
  /**
   * The next invoice number.
   *
   * Mock: a counter in component state. Real: issued by the server inside
   * the write transaction. See lib/pos-utils.ts.
   */
  const [sequence, setSequence] = useState(startingSequence);

  const [state, dispatch] = useReducer(
    posReducer,
    formatInvoiceNumber(startingSequence),
    createInitialState
  );

  /**
   * Derived, never stored. Recomputed whenever the lines, the discount or
   * the paid amount change, so the summary can never disagree with the
   * rows above it.
   */
  const totals = useMemo(
    () => calculatePOSTotals(state.items, state.discount, state.paidAmount),
    [state.items, state.discount, state.paidAmount]
  );

  const addProduct = useCallback(
    (product: Product) => dispatch({ type: "ADD_PRODUCT", product }),
    []
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      dispatch({ type: "SET_QUANTITY", productId, quantity }),
    []
  );

  const removeItem = useCallback(
    (productId: string) => dispatch({ type: "REMOVE_ITEM", productId }),
    []
  );

  const setCustomer = useCallback(
    (customerId: string) => dispatch({ type: "SET_CUSTOMER", customerId }),
    []
  );

  const setDiscount = useCallback(
    (discount: number) => dispatch({ type: "SET_DISCOUNT", discount }),
    []
  );

  const setPaidAmount = useCallback(
    (paidAmount: number) => dispatch({ type: "SET_PAID", paidAmount }),
    []
  );

  const setPaymentMethod = useCallback(
    (method: POSPaymentMethod) =>
      dispatch({ type: "SET_PAYMENT_METHOD", method }),
    []
  );

  /** Clears everything and moves to the next invoice number. */
  const startNewBill = useCallback(() => {
    const next = sequence + 1;
    setSequence(next);
    dispatch({ type: "RESET", invoiceNumber: formatInvoiceNumber(next) });
  }, [sequence]);

  /** How many of this product are already on the bill - lets the product
   *  list show "2 on bill" and disable Add once stock is exhausted. */
  const getBilledQuantity = useCallback(
    (productId: string) =>
      state.items.find((i) => i.productId === productId)?.quantity ?? 0,
    [state.items]
  );

  return {
    ...state,
    totals,
    addProduct,
    setQuantity,
    removeItem,
    setCustomer,
    setDiscount,
    setPaidAmount,
    setPaymentMethod,
    startNewBill,
    getBilledQuantity,
  };
}
