"use client";

import { useMemo, useState } from "react";
import {
  ShoppingBag,
  Clock,
  Loader,
  CheckCircle2,
  XCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/KpiCard";
import { OrderTable } from "@/components/admin/orders/OrderTable";
import { useOrders } from "@/context/OrdersContext";
import {
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_CONFIG,
  isCompletedBucket,
  isPendingBucket,
  isProcessingBucket,
} from "@/lib/order-status";
import {
  DATE_RANGE_LABELS,
  EMPTY_ORDER_FILTERS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  filterOrders,
  hasActiveOrderFilters,
  type OrderDateRange,
  type OrderFilterState,
} from "@/lib/order-display";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types";

/**
 * /admin/orders.
 *
 * Reads the SHARED order data via OrdersContext - the same orders the
 * customer account list and the tracking page render. No admin-only copy.
 */
export function OrdersView() {
  const { orders } = useOrders();
  const [filters, setFilters] = useState<OrderFilterState>(EMPTY_ORDER_FILTERS);

  const set = <K extends keyof OrderFilterState>(
    key: K,
    value: OrderFilterState[K]
  ) => setFilters((f) => ({ ...f, [key]: value }));

  // Summary counts EVERY order, not the filtered view - "3 pending" must
  // mean three in the shop, not three on this screen.
  const summary = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => isPendingBucket(o.status)).length,
      processing: orders.filter((o) => isProcessingBucket(o.status)).length,
      completed: orders.filter((o) => isCompletedBucket(o.status)).length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    }),
    [orders]
  );

  const visible = useMemo(() => filterOrders(orders, filters), [orders, filters]);
  const filtersActive = hasActiveOrderFilters(filters);

  return (
    <>
      {/* ---------------- SUMMARY ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <KpiCard
          title="Total Orders"
          value={String(summary.total)}
          Icon={ShoppingBag}
          tone="navy"
          description="All time"
        />
        <KpiCard
          title="Pending Orders"
          value={String(summary.pending)}
          Icon={Clock}
          tone="gold"
          description="Awaiting confirmation"
        />
        <KpiCard
          title="Processing"
          value={String(summary.processing)}
          Icon={Loader}
          tone="cyan"
          description="Confirmed through to delivery"
        />
        <KpiCard
          title="Completed"
          value={String(summary.completed)}
          Icon={CheckCircle2}
          tone="success"
          description="Delivered only"
        />
        <KpiCard
          title="Cancelled"
          value={String(summary.cancelled)}
          Icon={XCircle}
          tone="navy"
          description="Finished, but not completed"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 space-y-2">
        <div className="relative">
          <label htmlFor="order-search" className="sr-only">
            Search by order number, customer name or phone
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="order-search"
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search order number, customer or phone..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(v) => set("status", v as OrderStatus | "all")}
          >
            <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by order status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Order Status</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.paymentStatus}
            onValueChange={(v) => set("paymentStatus", v as PaymentStatus | "all")}
          >
            <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by payment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Status</SelectItem>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PAYMENT_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.paymentMethod}
            onValueChange={(v) => set("paymentMethod", v as PaymentMethod | "all")}
          >
            <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by payment method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.dateRange}
            onValueChange={(v) => set("dateRange", v as OrderDateRange)}
          >
            <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DATE_RANGE_LABELS) as OrderDateRange[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {DATE_RANGE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(EMPTY_ORDER_FILTERS)}
              className="h-10 shrink-0 gap-1.5 px-3 text-xs"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {orders.length} orders
      </p>

      <div className="mt-3">
        <OrderTable orders={visible} />
      </div>

    </>
  );
}
