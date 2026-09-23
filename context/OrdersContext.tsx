"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoOrders } from "@/data/orders";
import { canTransitionOrderStatus, ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/order-status";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { Order, OrderActivity, OrderStatus, PaymentStatus } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:order-changes:v1";

/**
 * Admin-side order state.
 *
 * WHAT IS STORED: only the CHANGES an admin makes, keyed by order
 * number - not a whole second copy of the order list. The seed data in
 * data/orders.ts stays the single source for everything else, so the
 * admin, the customer account and the tracking page all read the same
 * orders and cannot drift.
 *
 *     demoOrders (shared)  +  local changes (admin browser)  =  what admin sees
 *
 * KNOWN LIMITATION, stated plainly: changes live in this browser. A
 * status moved to Shipped here does NOT reach the customer's tracking
 * page, because that renders from the shared seed on the server. That
 * divergence is not a bug in this code - it is precisely the problem a
 * shared database solves, and it is why the real version must be
 * server-side with Firestore listeners on both ends.
 */
interface OrderChange {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  updatedAt: string;
  /** Entries appended since the seed. */
  activity: OrderActivity[];
}

export type OrderUpdateResult =
  | { ok: true; order: Order }
  | { ok: false; error: string };

interface OrdersContextValue {
  orders: Order[];
  getOrder: (orderNumber: string) => Order | undefined;
  updateOrderStatus: (orderNumber: string, next: OrderStatus) => OrderUpdateResult;
  updatePaymentStatus: (
    orderNumber: string,
    next: PaymentStatus
  ) => OrderUpdateResult;
  cancelOrder: (orderNumber: string, reason: string) => OrderUpdateResult;
  /** Discards admin changes and returns to the shared seed. */
  resetChanges: () => void;
  localChangeCount: number;
  isHydrated: boolean;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function readStoredChanges(): Record<string, OrderChange> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, OrderChange>;
  } catch {
    return {};
  }
}

function makeActivity(message: string, by = "Admin"): OrderActivity {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    message,
    by,
  };
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [changes, setChanges] = useState<Record<string, OrderChange>>(
    readStoredChanges
  );
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
    } catch {
      // Storage blocked or full - changes still work for this session.
    }
  }, [changes]);

  /** Seed orders with admin changes layered on top. */
  const orders = useMemo(() => {
    const applied = isHydrated ? changes : {};

    return demoOrders
      .map((order) => {
        const change = applied[order.orderNumber];
        if (!change) return order;

        return {
          ...order,
          status: change.status ?? order.status,
          paymentStatus: change.paymentStatus ?? order.paymentStatus,
          updatedAt: change.updatedAt,
          activity: [...order.activity, ...change.activity],
        };
      })
      .sort(
        (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      );
  }, [changes, isHydrated]);

  const getOrder = useCallback(
    (orderNumber: string) =>
      orders.find(
        (o) => o.orderNumber.toLowerCase() === orderNumber.toLowerCase()
      ),
    [orders]
  );

  /** Records one change plus its activity entry, atomically. */
  const commit = useCallback(
    (
      orderNumber: string,
      patch: Partial<Pick<OrderChange, "status" | "paymentStatus">>,
      message: string
    ) => {
      const now = new Date().toISOString();
      setChanges((current) => {
        const existing = current[orderNumber];
        return {
          ...current,
          [orderNumber]: {
            status: patch.status ?? existing?.status,
            paymentStatus: patch.paymentStatus ?? existing?.paymentStatus,
            updatedAt: now,
            activity: [...(existing?.activity ?? []), makeActivity(message)],
          },
        };
      });
    },
    []
  );

  /**
   * Move an order forward.
   *
   * Validation runs through canTransitionOrderStatus() from
   * lib/order-status.ts - the same function the dialog uses to decide
   * which options to offer. Checking here too means a stale dialog or a
   * future caller cannot bypass the rule.
   */
  const updateOrderStatus = useCallback(
    (orderNumber: string, next: OrderStatus): OrderUpdateResult => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };

      if (!canTransitionOrderStatus(order.status, next)) {
        return {
          ok: false,
          error: `An order cannot move from ${ORDER_STATUS_CONFIG[order.status].label} to ${ORDER_STATUS_CONFIG[next].label}.`,
        };
      }

      commit(
        orderNumber,
        { status: next },
        `Order moved from ${ORDER_STATUS_CONFIG[order.status].label} to ${ORDER_STATUS_CONFIG[next].label}.`
      );

      return { ok: true, order: { ...order, status: next } };
    },
    [getOrder, commit]
  );

  /**
   * Payment status moves independently of order status - a delivered
   * order can still be awaiting cash from the rider.
   */
  const updatePaymentStatus = useCallback(
    (orderNumber: string, next: PaymentStatus): OrderUpdateResult => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };
      if (order.paymentStatus === next) {
        return { ok: false, error: "Payment status is already set to that." };
      }

      commit(
        orderNumber,
        { paymentStatus: next },
        `Payment status changed to ${PAYMENT_STATUS_CONFIG[next].label}.`
      );

      return { ok: true, order: { ...order, paymentStatus: next } };
    },
    [getOrder, commit]
  );

  /**
   * Cancel.
   *
   * Goes through the same transition check, so an order already on a
   * rider cannot be cancelled - the correct move there is a return.
   *
   * NOTE WHAT THIS DOES NOT DO: it does not touch stock. No inventory
   * transaction was ever created for this order (creating an order is
   * not a sale), so there is nothing to give back. See the note at the
   * bottom of lib/order-utils.ts.
   */
  const cancelOrder = useCallback(
    (orderNumber: string, reason: string): OrderUpdateResult => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };

      if (!canTransitionOrderStatus(order.status, "cancelled")) {
        return {
          ok: false,
          error: `An order that is ${ORDER_STATUS_CONFIG[order.status].label.toLowerCase()} can no longer be cancelled.`,
        };
      }

      const trimmed = reason.trim();
      commit(
        orderNumber,
        { status: "cancelled" },
        trimmed ? `Order cancelled. Reason: ${trimmed}` : "Order cancelled."
      );

      return { ok: true, order: { ...order, status: "cancelled" } };
    },
    [getOrder, commit]
  );

  const resetChanges = useCallback(() => setChanges({}), []);

  const value = useMemo(
    () => ({
      orders,
      getOrder,
      updateOrderStatus,
      updatePaymentStatus,
      cancelOrder,
      resetChanges,
      localChangeCount: isHydrated ? Object.keys(changes).length : 0,
      isHydrated,
    }),
    [
      orders,
      getOrder,
      updateOrderStatus,
      updatePaymentStatus,
      cancelOrder,
      resetChanges,
      changes,
      isHydrated,
    ]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders must be used inside an <OrdersProvider>");
  }
  return context;
}
