import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardKpis } from "@/components/admin/DashboardKpis";
import { SalesOverview } from "@/components/admin/SalesOverview";
import { SalesChannel } from "@/components/admin/SalesChannel";
import { LowStockTable } from "@/components/admin/LowStockTable";
import { RecentSalesTable } from "@/components/admin/RecentSalesTable";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * /admin - the dashboard.
 *
 * A Server Component that composes. It does no maths of its own.
 *
 * UPDATED IN STEP 8. The KPI row used to render four hard-coded strings
 * from data/admin.ts. It now renders <DashboardKpis />, which calls the
 * SAME getFinancialSummary() that /admin/revenue and /admin/profit-loss
 * call. One calculation, three pages - so the dashboard can no longer
 * quietly disagree with the reports.
 *
 * DashboardKpis and SalesOverview are client islands: the finance stores
 * are client contexts, and Recharts measures the DOM.
 *
 * PHASE 2 inverts this. Profit and stock value both need purchase prices,
 * which a cashier's session must never contain, so a trusted server will
 * aggregate Firestore and send down finished numbers instead of the cost
 * data behind them.
 */
export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your shop performance"
      />

      {/* KPI row. A client island: the figures come from the shared
          finance layer, which reads the client-side stores. */}
      <DashboardKpis />

      {/*
        Charts: the trend gets two thirds, the channel split one third.

        min-w-0 on the grid children is load-bearing, not tidiness. A grid
        item defaults to min-width:auto, meaning it will not shrink below
        its content - and the chart's SVG has an intrinsic width. Without
        this the chart pushed the whole dashboard wider than a phone
        screen and every card got clipped.
      */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SalesOverview />
        </div>
        <div className="min-w-0">
          <SalesChannel />
        </div>
      </div>

      {/*
        Both tables get the FULL width, stacked.

        They were side by side at xl, and it did not survive contact with
        real content: Recent Sales has six columns, and in half a column
        the invoice number, the customer name and the amount all wrapped
        onto two lines. Half of 1232px is not enough for six columns at any
        breakpoint worth targeting, so they stack.
      */}
      <div className="mt-4 space-y-4">
        <RecentSalesTable />
        <LowStockTable />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        The KPI row is calculated from real sale, expense and stock records by
        the shared finance layer. The charts and tables below are still demo
        values. All underlying data is mock.
      </p>
    </>
  );
}
