"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import {
  calculatePOSTotals,
  customToPOSItem,
  formatInvoiceNumber,
  productToPOSItem,
} from "@/lib/pos-utils";
import { BANK_ACCOUNTS, COUNTER_SELLERS } from "@/lib/constants";
import { toDateInputValue } from "@/lib/date-range";
import { now } from "@/lib/demo-clock";
import { STOCK_TRACKING_ENABLED } from "@/lib/feature-flags";
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
  /**
   * WHO IS BUYING, typed on the bill rather than chosen from a
   * directory.
   *
   * The counter serves people it has never seen before and will not see
   * again, and making somebody search a customer list before they can
   * ring up a Rs 349 screen protector cost more time than the record
   * was ever worth. Blank is allowed and prints as "Walk-in Customer".
   */
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: POSCartItem[];
  /** What the cashier TYPED. The clamped value comes from the totals. */
  discount: number;
  /** Likewise - raw input, so we can tell them it is too high. */
  paidAmount: number;
  paymentMethod: POSPaymentMethod;
  /** Which owner is serving. Printed on the receipt and stored. */
  soldBy: string;
  /** Only meaningful when paymentMethod is "bank-transfer". */
  bankAccount: string;
  /**
   * THE DAY THE SALE HAPPENED, as "YYYY-MM-DD". Today for every normal
   * bill; moved back to key in an older one.
   *
   * It exists because the shop has six months of paper bills and every
   * other record - expenses, purchases, payments to the landlord - can
   * already be back-dated. The till could not, so a month's costs could
   * be entered while its takings could not, and the month then reported
   * a loss that never happened.
   */
  saleDate: string;
}

/** What the off-catalogue form collects. */
export interface CustomLineInput {
  name: string;
  price: number;
  purchasePrice: number;
  quantity: number;
}

type POSAction =
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "ADD_CUSTOM"; input: CustomLineInput }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "SET_CUSTOMER_FIELD"; field: "customerName" | "customerPhone" | "customerAddress"; value: string }
  | { type: "SET_DISCOUNT"; discount: number }
  | { type: "SET_PAID"; paidAmount: number }
  | { type: "SET_PAYMENT_METHOD"; method: POSPaymentMethod }
  | { type: "SET_SOLD_BY"; soldBy: string }
  | { type: "SET_BANK_ACCOUNT"; bankAccount: string }
  | { type: "SET_SALE_DATE"; saleDate: string }
  | { type: "RESET"; invoiceNumber: string; saleDate: string };

function createInitialState(invoiceNumber: string, saleDate?: string): POSState {
  return {
    invoiceNumber,
    saleDate: saleDate ?? toDateInputValue(now()),
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    items: [],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "cash",
    /**
     * Defaults to the first owner rather than to nobody. A required
     * field left blank is a bill that cannot be saved until somebody
     * notices why, on a till where the common case is one person
     * working a shift - and the wrong default is one click to correct,
     * where a blank one is a dead end mid-sale.
     */
    soldBy: COUNTER_SELLERS[0],
    // Pre-selected so choosing "Bank Transfer" never leaves an empty
    // required box behind it; one click corrects it, a blank is a dead
    // end mid-sale.
    bankAccount: BANK_ACCOUNTS[0],
  };
}

function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case "ADD_PRODUCT": {
      const { product } = action;
      // Nothing is out of stock when nothing is counted.
      if (STOCK_TRACKING_ENABLED && product.stock <= 0) return state;

      const existing = state.items.find((i) => i.productId === product.id);

      if (existing) {
        // Already on the bill: bump the line, never add a second row.
        // Capped at stock so repeated clicking cannot oversell.
        const nextQuantity = STOCK_TRACKING_ENABLED
          ? Math.min(existing.quantity + 1, product.stock)
          : existing.quantity + 1;
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: nextQuantity,
                  // Without counting, stock tracks quantity - see the
                  // note in SET_QUANTITY for why it must.
                  stock: STOCK_TRACKING_ENABLED ? item.stock : nextQuantity,
                }
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

    case "ADD_CUSTOM": {
      /**
       * Always a NEW row, never merged into an existing one.
       *
       * Two catalogue lines for the same product are the same thing and
       * get combined. Two off-catalogue items that happen to share a
       * name need not be: "Charger" bought in at 800 and "Charger"
       * bought in at 950 are different purchases with different costs,
       * and silently merging them would average a cost the shop never
       * paid.
       */
      return {
        ...state,
        items: [customToPOSItem(action.input), ...state.items],
      };
    }

    case "SET_QUANTITY": {
      // Clamped here, in the reducer, so no caller can push a line out of
      // range - not the stepper, not a future barcode scanner.
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.productId !== action.productId) return item;
          const wanted = Math.max(1, action.quantity);
          /**
           * A custom line has no stock to be capped by. Clamping it to
           * item.stock would pin it at whatever it was created with, so
           * the stepper would appear broken; stock moves with it
           * instead, keeping every downstream "quantity > stock" guard
           * satisfied without any of them needing to know about custom
           * lines.
           */
          /**
           * Custom lines never had a ceiling; with counting off, nothing
           * does. Keeping the cap would have left the till refusing to
           * sell 30 of something the shelf records as 25 - a number
           * nobody maintains - while the server happily accepts it. The
           * stock figure travels with the quantity so every shared
           * "quantity > stock" guard stays satisfied.
           */
          if (item.isCustom || !STOCK_TRACKING_ENABLED) {
            return { ...item, quantity: wanted, stock: wanted };
          }
          return { ...item, quantity: Math.min(wanted, item.stock) };
        }),
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.productId !== action.productId),
      };

    case "SET_CUSTOMER_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_DISCOUNT":
      return { ...state, discount: Math.max(0, action.discount) };

    case "SET_PAID":
      return { ...state, paidAmount: Math.max(0, action.paidAmount) };

    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.method };

    case "SET_SOLD_BY":
      return { ...state, soldBy: action.soldBy };

    case "SET_BANK_ACCOUNT":
      return { ...state, bankAccount: action.bankAccount };

    case "SET_SALE_DATE":
      return { ...state, saleDate: action.saleDate };

    case "RESET":
      /**
       * THE DATE SURVIVES THE RESET, alone among the fields.
       *
       * Everything else must be cleared - a discount or a customer name
       * carried into the next bill is a money bug, which is the reason
       * this reducer exists. The date is the opposite case: entering a
       * day's worth of old bills means ringing up several in a row for
       * the SAME day, and snapping back to today after each one would
       * silently file the second bill onwards in the wrong month. It is
       * also the one field the cashier can see at a glance, so a stale
       * value cannot go unnoticed the way a stale discount could.
       */
      return createInitialState(action.invoiceNumber, action.saleDate);

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

  const addCustomItem = useCallback(
    (input: CustomLineInput) => dispatch({ type: "ADD_CUSTOM", input }),
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

  const setCustomerField = useCallback(
    (field: "customerName" | "customerPhone" | "customerAddress", value: string) =>
      dispatch({ type: "SET_CUSTOMER_FIELD", field, value }),
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

  const setSoldBy = useCallback(
    (soldBy: string) => dispatch({ type: "SET_SOLD_BY", soldBy }),
    []
  );

  const setBankAccount = useCallback(
    (bankAccount: string) => dispatch({ type: "SET_BANK_ACCOUNT", bankAccount }),
    []
  );

  const setSaleDate = useCallback(
    (saleDate: string) => dispatch({ type: "SET_SALE_DATE", saleDate }),
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
    dispatch({
      type: "RESET",
      invoiceNumber: formatInvoiceNumber(next),
      saleDate: state.saleDate,
    });
  }, [sequence, state.saleDate]);

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
    addCustomItem,
    setQuantity,
    removeItem,
    setCustomerField,
    setDiscount,
    setPaidAmount,
    setPaymentMethod,
    setSoldBy,
    setBankAccount,
    setSaleDate,
    startNewBill,
    getBilledQuantity,
  };
}
