import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardKpis } from "@/components/admin/DashboardKpis";
import { SalesOverview } from "@/components/admin/SalesOverview";
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
        Sales over time, now the full width.

        It shared this row two-thirds/one-third with a Sales Channel
        card until the shop asked for that card to go. Nothing takes
        its third: a column left empty beside a table reads as
        something failing to load, and the table is easier to scan
        across the whole width anyway.

        min-w-0 stays. A grid item defaults to min-width:auto, meaning
        it will not shrink below its content, and that is what pushed
        the dashboard wider than a phone screen once before.
      */}
      <div className="mt-4 min-w-0">
        <SalesOverview />
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

      {/*
        This line used to say the tables below were demo values and the
        data was mock. That stopped being true when each of them was
        moved onto the live contexts, and it is worse than no note at
        all: a shop that has been told its dashboard is fake will not
        act on a low-stock warning that is real.
      */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Every figure on this page comes from real sale, expense and stock
        records through the shared finance layer - the same one behind Revenue
        and Profit &amp; Loss, so the three cannot disagree.
      </p>
    </>
  );
}
