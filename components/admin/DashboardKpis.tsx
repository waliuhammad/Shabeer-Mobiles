"use client";

import { useMemo } from "react";
import { Banknote, TrendingUp, ShoppingBag, Warehouse } from "lucide-react";
import { KpiCard } from "@/components/admin/KpiCard";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useExpenses } from "@/context/ExpensesContext";
import { useInventory } from "@/context/InventoryContext";
import { getFinancialSummary, getRevenueEntries } from "@/lib/finance-utils";
import { resolvePeriod } from "@/lib/date-range";
import { products } from "@/data/products";
import { getProductCost } from "@/data/product-costs";
import { formatPrice } from "@/lib/utils";

/**
 * The dashboard KPI row.
 *
 * WHY THIS REPLACED data/admin.ts's dashboardStats
 * ------------------------------------------------
 * Those were four hard-coded strings ("Rs 50,000", "Rs 12,500"). They
 * looked like a dashboard but agreed with nothing - open /admin/revenue
 * and you would get a different answer for the same day.
 *
 * Now every figure comes from getFinancialSummary(), the SAME function
 * behind /admin/revenue and /admin/profit-loss, over the same "today"
 * range. The three pages cannot disagree, because there is only one
 * calculation.
 *
 * A client component because the finance stores are client contexts. In
 * Phase 2 this inverts: a trusted server aggregates Firestore and sends
 * down four numbers, so the browser never holds the purchase costs that
 * profit is computed from.
 */
export function DashboardKpis() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const { getStock } = useInventory();

  const today = useMemo(() => resolvePeriod("today"), []);

  const summary = useMemo(
    () => getFinancialSummary(orders, invoices, expenses, today),
    [orders, invoices, expenses, today]
  );

  const orderCount = useMemo(
    () => getRevenueEntries(orders, invoices, today).length,
    [orders, invoices, today]
  );

  /**
   * Stock on hand at cost.
   *
   * This one legitimately uses data/product-costs.ts - the CURRENT cost -
   * because it answers "what is the stock sitting here worth now", not
   * "what did something sold in the past cost". That is exactly the
   * distinction the two cost sources exist to keep apart.
   */
  const stockValue = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + getStock(p.id) * getProductCost(p.id),
        0
      ),
    [getStock]
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        title="Today's Revenue"
        value={formatPrice(summary.revenue)}
        Icon={Banknote}
        tone="navy"
        description="Completed sales today"
      />
      <KpiCard
        title="Today's Profit"
        value={
          summary.netProfit < 0
            ? `- ${formatPrice(Math.abs(summary.netProfit))}`
            : formatPrice(summary.netProfit)
        }
        Icon={TrendingUp}
        tone="success"
        description="After cost of goods and today's expenses"
      />
      <KpiCard
        title="Today's Sales"
        value={String(orderCount)}
        Icon={ShoppingBag}
        tone="cyan"
        description="Counter and online combined"
      />
      <KpiCard
        title="Total Stock Value"
        value={formatPrice(stockValue)}
        Icon={Warehouse}
        tone="gold"
        description="Stock on hand at current cost"
      />
    </div>
  );
}
