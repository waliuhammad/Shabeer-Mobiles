/**
 * Report building and CSV export.
 *
 * NOTHING here recalculates finance. Every money figure a report shows
 * comes from lib/finance-utils.ts, exactly as /admin/revenue and
 * /admin/profit-loss do - which is why the reports page could be built
 * without touching the finance layer at all. If a report disagreed with
 * the Profit & Loss page, one of them would be lying.
 */

export type ReportId =
  | "sales"
  | "profit"
  | "expenses"
  | "inventory"
  | "purchases"
  | "customers";

export interface ReportMeta {
  id: ReportId;
  title: string;
  description: string;
  /** Does this report vary with the selected period? */
  periodic: boolean;
}

export const REPORTS: ReportMeta[] = [
  {
    id: "sales",
    title: "Sales Report",
    description: "Every completed sale in the period, both channels, with totals.",
    periodic: true,
  },
  {
    id: "profit",
    title: "Profit Report",
    description: "Revenue, cost of goods sold, gross profit and margin per sale.",
    periodic: true,
  },
  {
    id: "expenses",
    title: "Expense Report",
    description: "Operating expenses by category. Cancelled rows are excluded.",
    periodic: true,
  },
  {
    id: "inventory",
    title: "Inventory Report",
    description: "Stock on hand, valued at current cost. A snapshot, not a period.",
    periodic: false,
  },
  {
    id: "purchases",
    title: "Purchase Report",
    description: "Supplier purchases, what was paid and what is still owed.",
    periodic: true,
  },
  {
    id: "customers",
    title: "Customer Report",
    description: "Customers with their order counts and lifetime spend.",
    periodic: true,
  },
];

export function getReport(id: ReportId): ReportMeta {
  // The union guarantees a hit; the fallback keeps TypeScript happy
  // without an assertion.
  return REPORTS.find((r) => r.id === id) ?? REPORTS[0];
}

/** A rendered report: column headings plus rows of already-formatted cells. */
export interface ReportTable {
  columns: string[];
  /** Raw values, so CSV keeps numbers and the UI can format them. */
  rows: (string | number)[][];
  /** Optional totals row, rendered in bold and appended to the CSV. */
  totals?: (string | number)[];
}

/**
 * RFC 4180 escaping.
 *
 * Product names contain commas ("iPhone 12 (Used), 64GB") and the shop's
 * notes contain quotes. Without this a single comma would silently shift
 * every following column in the accountant's spreadsheet - the kind of
 * bug nobody notices until the totals are wrong.
 */
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(table: ReportTable): string {
  const lines = [table.columns.map(csvCell).join(",")];
  for (const row of table.rows) lines.push(row.map(csvCell).join(","));
  if (table.totals) lines.push(table.totals.map(csvCell).join(","));
  // CRLF, because Excel on Windows is the most likely destination.
  return lines.join("\r\n");
}

/**
 * Triggers a download in the browser.
 *
 * A Blob plus an object URL, no dependency. Real exports will eventually
 * be generated server-side so the figures cannot be edited on the way
 * out, but for a shop handing a file to its accountant this is honest:
 * the numbers come from the same finance layer the screen shows.
 */
export function downloadCSV(filename: string, csv: string): void {
  // A BOM, so Excel reads UTF-8 and does not mangle the Rs sign.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** "sales-report-2026-09-23.csv" */
export function reportFilename(id: ReportId, stamp: string): string {
  return `${id}-report-${stamp}.csv`;
}
