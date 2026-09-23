"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc } from "@/lib/firebase/write";
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  canTransitionOrderStatus,
} from "@/lib/order-status";
import { useAuth } from "@/context/AuthContext";
import type {
  Order,
  OrderActivity,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

/**
 * Online orders - live Firestore.
 *
 * The status rules are unchanged: a transition still has to be legal
 * according to lib/order-status.ts, and the activity trail still records
 * every change. What has changed is where the result goes - the
 * database, so the shop machine and the owner's laptop agree.
 *
 * THE REAL FIX THIS STILL NEEDS
 * -----------------------------
 * firestore.rules currently says `allow write: if false` on orders, so
 * these writes will be REFUSED until order mutations move to a trusted
 * server action. That is deliberate and it is the correct end state: an
 * order's total, its stock movements and its cost snapshot must be
 * computed together by code the customer cannot reach. A browser that
 * can write an order is a browser that can set total = 0.
 *
 * Until then the rule is relaxed for staff - see firestore.rules - and
 * this comment is the reminder of what has to replace it.
 */

export type OrderUpdateResult =
  | { ok: true; order: Order }
  | { ok: false; error: string };

interface OrdersContextValue {
  orders: Order[];
  getOrder: (orderNumber: string) => Order | undefined;
  updateOrderStatus: (orderNumber: string, next: OrderStatus) => Promise<OrderUpdateResult>;
  updatePaymentStatus: (
    orderNumber: string,
    next: PaymentStatus
  ) => Promise<OrderUpdateResult>;
  cancelOrder: (orderNumber: string, reason: string) => Promise<OrderUpdateResult>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function mapItem(raw: unknown): OrderItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const i = raw as Record<string, unknown>;
  if (typeof i.productId !== "string" || typeof i.quantity !== "number") return null;
  return {
    productId: i.productId,
    name: typeof i.name === "string" ? i.name : "",
    slug: typeof i.slug === "string" ? i.slug : "",
    sku: typeof i.sku === "string" ? i.sku : "",
    image: typeof i.image === "string" ? i.image : null,
    price: typeof i.price === "number" ? i.price : 0,
    quantity: i.quantity,
    purchasePrice: typeof i.purchasePrice === "number" ? i.purchasePrice : 0,
  };
}

function mapActivity(raw: unknown): OrderActivity | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.message !== "string") return null;
  return {
    id: typeof a.id === "string" ? a.id : `act-${Math.random().toString(36).slice(2)}`,
    at: typeof a.at === "string" ? a.at : new Date(0).toISOString(),
    message: a.message,
    by: typeof a.by === "string" ? a.by : "System",
  };
}

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "processing", "ready",
  "shipped", "out-for-delivery", "delivered", "cancelled", "returned",
];

function mapOrder(doc: QueryDocumentSnapshot): Order | null {
  const d = doc.data();
  if (typeof d.orderNumber !== "string" || !Array.isArray(d.items)) return null;
  return {
    orderNumber: d.orderNumber,
    placedAt: typeof d.placedAt === "string" ? d.placedAt : new Date(0).toISOString(),
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
    customerId: typeof d.customerId === "string" ? d.customerId : null,
    customerName: typeof d.customerName === "string" ? d.customerName : "",
    phone: typeof d.phone === "string" ? d.phone : "",
    email: typeof d.email === "string" ? d.email : "",
    address: typeof d.address === "string" ? d.address : "",
    city: typeof d.city === "string" ? d.city : "",
    postalCode: typeof d.postalCode === "string" ? d.postalCode : "",
    notes: typeof d.notes === "string" ? d.notes : "",
    internalNote: typeof d.internalNote === "string" ? d.internalNote : "",
    items: d.items.map(mapItem).filter((i): i is OrderItem => i !== null),
    subtotal: typeof d.subtotal === "number" ? d.subtotal : 0,
    discount: typeof d.discount === "number" ? d.discount : 0,
    delivery: typeof d.delivery === "number" ? d.delivery : 0,
    total: typeof d.total === "number" ? d.total : 0,
    paymentMethod: (typeof d.paymentMethod === "string"
      ? d.paymentMethod
      : "cash-on-delivery") as PaymentMethod,
    paymentStatus: (["pending", "paid", "failed", "refunded"].includes(d.paymentStatus)
      ? d.paymentStatus
      : "pending") as PaymentStatus,
    status: (ORDER_STATUSES.includes(d.status) ? d.status : "pending") as OrderStatus,
    activity: Array.isArray(d.activity)
      ? d.activity.map(mapActivity).filter((a): a is OrderActivity => a !== null)
      : [],
  };
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && Boolean(user?.isStaff);

  const state = useFirestoreCollection<Order>(COLLECTIONS.orders, mapOrder, { enabled });

  const orders = useMemo(
    () => [...state.items].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
    [state.items]
  );

  const getOrder = useCallback(
    (orderNumber: string) => orders.find((o) => o.orderNumber === orderNumber),
    [orders]
  );

  /**
   * Writes the change AND the activity row together, so an order can
   * never show a status nothing explains.
   */
  const commit = useCallback(
    async (order: Order, changes: Partial<Order>, message: string) => {
      const at = new Date().toISOString();
      const entry: OrderActivity = {
        id: `act-${Date.now()}`,
        at,
        message,
        by: user?.displayName ?? user?.email ?? "Admin",
      };
      await writeDoc(COLLECTIONS.orders, order.orderNumber, {
        ...changes,
        updatedAt: at,
        activity: [...order.activity, entry],
      });
    },
    [user]
  );

  const updateOrderStatus = useCallback(
    async (orderNumber: string, next: OrderStatus): Promise<OrderUpdateResult> => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };

      if (!canTransitionOrderStatus(order.status, next)) {
        return {
          ok: false,
          error: `An order cannot move from ${ORDER_STATUS_CONFIG[order.status].label} to ${ORDER_STATUS_CONFIG[next].label}.`,
        };
      }

      try {
        await commit(
          order,
          { status: next },
          `Order moved from ${ORDER_STATUS_CONFIG[order.status].label} to ${ORDER_STATUS_CONFIG[next].label}.`
        );
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not save.",
        };
      }

      return { ok: true, order: { ...order, status: next } };
    },
    [getOrder, commit]
  );

  /**
   * Payment status moves independently of order status - a delivered
   * order can still be awaiting cash from the rider.
   */
  const updatePaymentStatus = useCallback(
    async (orderNumber: string, next: PaymentStatus): Promise<OrderUpdateResult> => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };
      if (order.paymentStatus === next) {
        return { ok: false, error: "Payment status is already set to that." };
      }

      try {
        await commit(
          order,
          { paymentStatus: next },
          `Payment status changed to ${PAYMENT_STATUS_CONFIG[next].label}.`
        );
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not save.",
        };
      }

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
   * not a sale), so there is nothing to give back.
   */
  const cancelOrder = useCallback(
    async (orderNumber: string, reason: string): Promise<OrderUpdateResult> => {
      const order = getOrder(orderNumber);
      if (!order) return { ok: false, error: "Order not found." };

      if (!canTransitionOrderStatus(order.status, "cancelled")) {
        return {
          ok: false,
          error: `An order that is ${ORDER_STATUS_CONFIG[order.status].label.toLowerCase()} can no longer be cancelled.`,
        };
      }

      const trimmed = reason.trim();
      if (!trimmed) return { ok: false, error: "Give a reason for the cancellation." };

      try {
        await commit(order, { status: "cancelled" }, `Order cancelled. Reason: ${trimmed}`);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not save.",
        };
      }

      return { ok: true, order: { ...order, status: "cancelled" } };
    },
    [getOrder, commit]
  );

  const value = useMemo(
    () => ({
      orders,
      getOrder,
      updateOrderStatus,
      updatePaymentStatus,
      cancelOrder,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [
      orders, getOrder, updateOrderStatus, updatePaymentStatus, cancelOrder,
      state.loading, state.error,
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
