"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck,
  CalendarDays,
  Receipt,
  Wallet,
  Search,
  X,
  Plus,
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
import { PurchaseTable } from "@/components/admin/purchases/PurchaseTable";
import { usePurchasing } from "@/context/PurchasingContext";
import {
  EMPTY_PURCHASE_FILTERS,
  PURCHASE_DATE_LABELS,
  PURCHASE_PAYMENT_STATUSES,
  PURCHASE_PAYMENT_STATUS_CONFIG,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_CONFIG,
  countsTowardPayables,
  filterPurchases,
  hasActivePurchaseFilters,
  purchasesThisMonth,
  type PurchaseDateRange,
  type PurchaseFilterState,
} from "@/lib/purchase-utils";
import { formatPrice } from "@/lib/utils";
import type { PurchasePaymentStatus, PurchaseStatus } from "@/types";

/**
 * /admin/purchases.
 *
 * Every summary figure counts RECEIVED purchases only. A draft is a plan
 * and a cancelled purchase never happened - including either would
 * report money the shop has not spent and does not owe.
 */
export function PurchasesView() {
  const { purchases, suppliers } = usePurchasing();
  const [filters, setFilters] = useState<PurchaseFilterState>(EMPTY_PURCHASE_FILTERS);

  const set = <K extends keyof PurchaseFilterState>(
    key: K,
    value: PurchaseFilterState[K]
  ) => setFilters((f) => ({ ...f, [key]: value }));

  const summary = useMemo(() => {
    const counted = purchases.filter(countsTowardPayables);
    const thisMonth = purchasesThisMonth(purchases);
    return {
      total: counted.reduce((sum, p) => sum + p.total, 0),
      thisMonth: thisMonth.reduce((sum, p) => sum + p.total, 0),
      thisMonthCount: thisMonth.length,
      paid: counted.reduce((sum, p) => sum + p.paidAmount, 0),
      outstanding: counted.reduce((sum, p) => sum + p.dueAmount, 0),
    };
  }, [purchases]);

  const visible = useMemo(
    () => filterPurchases(purchases, filters),
    [purchases, filters]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Purchases"
          value={formatPrice(summary.total)}
          Icon={Truck}
          tone="navy"
          description="Received purchases only"
        />
        <KpiCard
          title="This Month"
          value={formatPrice(summary.thisMonth)}
          Icon={CalendarDays}
          tone="cyan"
          description={`${summary.thisMonthCount} received this month`}
        />
        <KpiCard
          title="Paid"
          value={formatPrice(summary.paid)}
          Icon={Receipt}
          tone="success"
          description="Settled with suppliers"
        />
        <KpiCard
          title="Outstanding"
          value={formatPrice(summary.outstanding)}
          Icon={Wallet}
          tone="gold"
          description="Still owed to suppliers"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="purchase-search" className="sr-only">
              Search by purchase number or supplier
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="purchase-search"
              type="search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Search purchase number or supplier..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <Button
            asChild
            className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            <Link href="/admin/purchases/new">
              <Plus className="size-4" aria-hidden="true" />
              New Purchase
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(v) => set("status", v as PurchaseStatus | "all")}
          >
            <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by purchase status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PURCHASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PURCHASE_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.paymentStatus}
            onValueChange={(v) =>
              set("paymentStatus", v as PurchasePaymentStatus | "all")
            }
          >
            <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by payment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              {PURCHASE_PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PURCHASE_PAYMENT_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.supplierId}
            onValueChange={(v) => set("supplierId", v)}
          >
            <SelectTrigger className="h-10 sm:w-52" aria-label="Filter by supplier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.dateRange}
            onValueChange={(v) => set("dateRange", v as PurchaseDateRange)}
          >
            <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PURCHASE_DATE_LABELS) as PurchaseDateRange[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {PURCHASE_DATE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActivePurchaseFilters(filters) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(EMPTY_PURCHASE_FILTERS)}
              className="h-10 shrink-0 gap-1.5 px-3 text-xs"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {purchases.length} purchases
      </p>

      <div className="mt-3">
        <PurchaseTable purchases={visible} />
      </div>
    </>
  );
}
