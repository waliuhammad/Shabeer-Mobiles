"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, ChartColumn, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/components/admin/finance/PeriodFilter";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useExpenses } from "@/context/ExpensesContext";
import { usePurchasing } from "@/context/PurchasingContext";
import { useCustomers } from "@/context/CustomersContext";
import { useCatalog } from "@/context/CatalogContext";
import { useInventory } from "@/context/InventoryContext";
import { getFinancialSummary, getRevenueEntries } from "@/lib/finance-utils";
import { getExpensesForPeriod, EXPENSE_CATEGORY_CONFIG, EXPENSE_STATUS_CONFIG, EXPENSE_PAYMENT_METHOD_LABELS } from "@/lib/expense-utils";
import { calculateCustomerStats } from "@/lib/customer-utils";
import { PURCHASE_STATUS_CONFIG } from "@/lib/purchase-utils";
import { PRODUCT_STATUS_CONFIG } from "@/lib/catalog-utils";
import { getStockStatus } from "@/lib/stock";
import {
  REPORTS, downloadCSV, getReport, reportFilename, toCSV,
  type ReportId, type ReportTable,
} from "@/lib/report-utils";
import {
  PROFIT_LOSS_PERIODS, REVENUE_PERIODS, formatRangeLabel, isValidRange,
  isWithinRange, resolvePeriod, toDateInputValue, type PeriodId,
} from "@/lib/date-range";
import { now } from "@/lib/demo-clock";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import { SALES_CHANNEL_LABELS } from "@/types";

const PERIODS: PeriodId[] = [...new Set([...PROFIT_LOSS_PERIODS, ...REVENUE_PERIODS])];

/**
 * /admin/reports.
 *
 * Six views over data that already exists, plus a CSV button. No report
 * computes its own money: sales and profit come straight from
 * getRevenueEntries()/getFinancialSummary(), so a report and the Profit
 * & Loss page cannot disagree.
 */
export function ReportsView() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const { purchases } = usePurchasing();
  const { people } = useCustomers();
  const { products, getCost } = useCatalog();
  const { getStock } = useInventory();

  const [reportId, setReportId] = useState<ReportId>("sales");
  const [period, setPeriod] = useState<PeriodId>("month");
  const [customStart, setCustomStart] = useState(() =>
    toDateInputValue(new Date(now().getFullYear(), now().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(now()));

  const report = getReport(reportId);
  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  const rangeOk = isValidRange(range);

  const table = useMemo<ReportTable>(() => {
    if (!rangeOk) return { columns: [], rows: [] };

    const entries = getRevenueEntries(orders, invoices, range);

    switch (reportId) {
      /* ---------------- SALES ---------------- */
      case "sales": {
        const rows = entries.map((e) => [
          e.reference,
          SALES_CHANNEL_LABELS[e.channel],
          e.customerName,
          formatOrderDate(e.at),
          e.itemCount,
          e.revenue,
          e.collected,
          e.revenue - e.collected,
          e.paymentLabel,
        ]);
        const sum = (i: number) => rows.reduce((t, r) => t + Number(r[i]), 0);
        return {
          columns: ["Reference", "Channel", "Customer", "Date", "Items", "Revenue", "Collected", "Outstanding", "Payment"],
          rows,
          totals: rows.length
            ? ["Total", "", "", "", sum(4), sum(5), sum(6), sum(7), ""]
            : undefined,
        };
      }

      /* ---------------- PROFIT ---------------- */
      case "profit": {
        const rows = entries.map((e) => [
          e.reference,
          SALES_CHANNEL_LABELS[e.channel],
          formatOrderDate(e.at),
          e.revenue,
          e.cogs,
          e.grossProfit,
          e.revenue > 0 ? Number(((e.grossProfit / e.revenue) * 100).toFixed(1)) : 0,
        ]);
        const s = getFinancialSummary(orders, invoices, expenses, range);
        return {
          columns: ["Reference", "Channel", "Date", "Revenue", "COGS", "Gross Profit", "Margin %"],
          rows,
          totals: rows.length
            ? ["Total", "", "", s.revenue, s.cogs, s.grossProfit,
               s.grossMargin === null ? 0 : Number(s.grossMargin.toFixed(1))]
            : undefined,
        };
      }

      /* ---------------- EXPENSES ---------------- */
      case "expenses": {
        const inPeriod = getExpensesForPeriod(expenses, range);
        const rows = inPeriod.map((e) => [
          e.title,
          EXPENSE_CATEGORY_CONFIG[e.category].label,
          formatOrderDate(e.expenseDate),
          EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod],
          EXPENSE_STATUS_CONFIG[e.status].label,
          e.amount,
        ]);
        const total = rows.reduce((t, r) => t + Number(r[5]), 0);
        return {
          columns: ["Expense", "Category", "Date", "Payment", "Status", "Amount"],
          rows,
          totals: rows.length ? ["Total", "", "", "", "", total] : undefined,
        };
      }

      /* ---------------- INVENTORY (a snapshot) ---------------- */
      case "inventory": {
        const rows = products
          .filter((p) => p.status !== "archived")
          .map((p) => {
            const stock = getStock(p.id);
            const cost = getCost(p.id);
            return [
              p.name, p.sku, p.categoryName,
              PRODUCT_STATUS_CONFIG[p.status].label,
              stock,
              getStockStatus(stock, p.lowStockThreshold) === "in-stock" ? "OK" : "Reorder",
              cost, stock * cost, p.price, stock * p.price,
            ];
          });
        const sum = (i: number) => rows.reduce((t, r) => t + Number(r[i]), 0);
        return {
          columns: ["Product", "SKU", "Category", "Status", "Stock", "Flag", "Unit Cost", "Stock Value", "Unit Price", "Retail Value"],
          rows,
          totals: rows.length
            ? ["Total", "", "", "", sum(4), "", "", sum(7), "", sum(9)]
            : undefined,
        };
      }

      /* ---------------- PURCHASES ---------------- */
      case "purchases": {
        const inPeriod = purchases.filter((p) => isWithinRange(p.createdAt, range));
        const rows = inPeriod.map((p) => [
          p.purchaseNumber, p.supplierName,
          formatOrderDate(p.createdAt),
          PURCHASE_STATUS_CONFIG[p.status].label,
          p.items.reduce((n, i) => n + i.quantity, 0),
          p.total, p.paidAmount, p.dueAmount,
        ]);
        const sum = (i: number) => rows.reduce((t, r) => t + Number(r[i]), 0);
        return {
          columns: ["Purchase", "Supplier", "Date", "Status", "Units", "Total", "Paid", "Due"],
          rows,
          totals: rows.length ? ["Total", "", "", "", sum(4), sum(5), sum(6), sum(7)] : undefined,
        };
      }

      /* ---------------- CUSTOMERS ---------------- */
      case "customers": {
        const rows = people.map((c) => {
          const stats = calculateCustomerStats(c.id, orders, invoices);
          return [
            c.name, c.phone, c.email || "", c.city || "",
            stats.orderCount, stats.posSaleCount, stats.totalSpent,
            stats.isRepeat ? "Yes" : "No",
            stats.lastPurchaseAt ? formatOrderDate(stats.lastPurchaseAt) : "Never",
          ];
        });
        const sum = (i: number) => rows.reduce((t, r) => t + Number(r[i]), 0);
        return {
          columns: ["Customer", "Phone", "Email", "City", "Online Orders", "Counter Sales", "Total Spent", "Repeat", "Last Purchase"],
          rows,
          totals: rows.length ? ["Total", "", "", "", sum(4), sum(5), sum(6), "", ""] : undefined,
        };
      }
    }
  }, [reportId, rangeOk, range, orders, invoices, expenses, purchases, people, products, getStock, getCost]);

  /** Which columns hold money, so the UI can format and right-align them. */
  const moneyColumns = useMemo(() => {
    const names = ["Revenue", "Collected", "Outstanding", "COGS", "Gross Profit",
      "Amount", "Unit Cost", "Stock Value", "Unit Price", "Retail Value",
      "Total", "Paid", "Due", "Total Spent"];
    return new Set(
      table.columns.map((c, i) => (names.includes(c) ? i : -1)).filter((i) => i >= 0)
    );
  }, [table.columns]);

  const numericColumns = useMemo(() => {
    const names = ["Items", "Units", "Stock", "Margin %", "Online Orders", "Counter Sales"];
    return new Set(
      table.columns.map((c, i) => (names.includes(c) ? i : -1)).filter((i) => i >= 0)
    );
  }, [table.columns]);

  function handleExport() {
    if (table.rows.length === 0) {
      toast.error("Nothing to export for this period.");
      return;
    }
    downloadCSV(
      reportFilename(reportId, toDateInputValue(now())),
      toCSV(table)
    );
    toast.success("Report downloaded.", {
      description: `${table.rows.length} rows as CSV.`,
    });
  }

  const cell = (value: string | number, index: number) => {
    if (moneyColumns.has(index) && typeof value === "number") return formatPrice(value);
    if (table.columns[index] === "Margin %" && typeof value === "number") return `${value}%`;
    return String(value);
  };

  return (
    <>
      {/* ---------------- REPORT PICKER ---------------- */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setReportId(r.id)}
              aria-pressed={reportId === r.id}
              className={cn(
                "flex h-full w-full flex-col rounded-xl border p-4 text-left transition-colors",
                reportId === r.id
                  ? "border-secondary bg-cyan-soft/40"
                  : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <span className="text-sm font-semibold text-foreground">{r.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {r.description}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* ---------------- PERIOD ---------------- */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        {report.periodic ? (
          <>
            <PeriodFilter
              periods={PERIODS}
              value={period}
              onChange={setPeriod}
              customStart={customStart}
              customEnd={customEnd}
              onCustomStart={setCustomStart}
              onCustomEnd={setCustomEnd}
              error={rangeOk ? undefined : "The end date is before the start date."}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatRangeLabel(range)} · {table.rows.length}{" "}
              {table.rows.length === 1 ? "row" : "rows"}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            This report is a snapshot of stock as it stands right now, so it has no
            date range - what is on the shelf today is not a period figure.
          </p>
        )}
      </div>

      {/* ---------------- RESULT ---------------- */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">{report.title}</h3>
          <p className="text-xs text-muted-foreground">{report.description}</p>
        </div>
        <Button
          type="button" onClick={handleExport} disabled={table.rows.length === 0}
          className="h-10 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Download className="size-4" aria-hidden="true" />Export CSV
        </Button>
      </div>

      {table.rows.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <ChartColumn className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {rangeOk ? "No data for this period" : "Invalid date range"}
          </p>
          <p className="max-w-sm px-4 text-xs text-muted-foreground">
            {rangeOk
              ? "Nothing in this report falls inside the selected dates. That is an empty period, not a failed calculation."
              : "The end date is before the start date, so nothing was worked out."}
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {/* Reports are wide and genuinely tabular, so below lg they scroll
              horizontally rather than collapsing into cards - a report you
              cannot line up column by column is not a report. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">{report.title}</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {table.columns.map((c, i) => (
                    <th
                      key={c} scope="col"
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 font-medium",
                        (moneyColumns.has(i) || numericColumns.has(i)) && "text-right"
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="transition-colors hover:bg-muted/40">
                    {row.map((value, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5",
                          ci === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                          (moneyColumns.has(ci) || numericColumns.has(ci)) &&
                            "text-right tabular-nums"
                        )}
                      >
                        {cell(value, ci)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {table.totals && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold text-foreground">
                    {table.totals.map((value, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5",
                          (moneyColumns.has(ci) || numericColumns.has(ci)) &&
                            "text-right tabular-nums"
                        )}
                      >
                        {value === "" ? "" : cell(value, ci)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        Every money figure here comes from the same finance layer as the Revenue and
        Profit &amp; Loss pages, so a report can never disagree with them. Reports
        containing cost, margin or profit are owner-and-manager material - a cashier
        must not have them. CSV is generated in the browser for now; a real export
        will be produced server-side so the numbers cannot be altered on the way out.
      </p>
    </>
  );
}
