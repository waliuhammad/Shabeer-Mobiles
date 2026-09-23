import { isCompletedBucket, ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/order-status";
import { PAYMENT_STATUS_STYLES } from "@/lib/pos-utils";
import { getExpensesByCategory, getTotalExpenses } from "@/lib/expense-utils";
import {
  bucketKeyFor,
  buildBuckets,
  isWithinRange,
  type Bucket,
  type BucketUnit,
  type DateRange,
} from "@/lib/date-range";
import type { Order } from "@/types/order";
import type { Invoice } from "@/types/pos";
import type { Expense } from "@/types/expense";
import type {
  FinancialBreakdown,
  FinancialSummary,
  RevenueEntry,
  RevenuePoint,
  SalesChannel,
} from "@/types/finance";

/**
 * THE finance layer. One file, one set of rules.
 *
 * Every financial number in this application comes from here: the
 * dashboard KPIs, /admin/revenue and /admin/profit-loss all call these
 * functions. That is the entire point. Three pages each doing their own
 * arithmetic is how a business ends up with three different answers to
 * "what did we make last month", and no way to tell which is right.
 *
 * THE CHAIN
 * ---------
 *       Revenue        completed sales, at the price charged
 *     - COGS           what those exact goods cost, historically
 *     = Gross Profit
 *     - Operating Expenses   rent, power, wages
 *     = Net Profit
 *
 * WHAT IS DELIBERATELY ABSENT: purchases. Buying stock is not an
 * operating expense - see the long note at the bottom of this file.
 */

// ---------------------------------------------------------------------
// Revenue recognition - WHEN a sale counts
// ---------------------------------------------------------------------

/**
 * Does this online order count as revenue?
 *
 * DELIVERED only. This is not a fresh opinion - it reuses
 * isCompletedBucket() from lib/order-status.ts, which the orders page
 * has used since Step 5 and which already documents the reasoning:
 * "an order that was cancelled is finished but not completed, and
 * counting it as such would flatter the numbers."
 *
 * So pending, confirmed, processing, ready, shipped and out-for-delivery
 * are all real orders that have NOT yet earned revenue - the shop could
 * still fail to deliver. cancelled and returned never earn it.
 *
 * A RETURNED order is the subtle one. The goods came back, so the sale
 * un-happened; it contributes neither revenue nor COGS. This project
 * does not model partial refunds or restocking fees, and pretending
 * otherwise would be worse than this simplification.
 */
export function countsAsRevenue(order: Order): boolean {
  return isCompletedBucket(order.status);
}

/**
 * Does this counter invoice count as revenue?
 *
 * Yes - every persisted one. The POS has no draft state: an invoice
 * only exists once the cashier has completed the bill and the goods
 * have left the counter. A cart in progress is never an Invoice, so
 * there is nothing here to exclude.
 *
 * Note this is a FUNCTION rather than an inline `true` so that when
 * refunds or voided invoices are added, there is exactly one place to
 * change - and the revenue page does not have to learn about it.
 */
export function invoiceCountsAsRevenue(invoice: Invoice): boolean {
  // Defensive only: a malformed row with no lines is not a sale.
  return invoice.items.length > 0;
}

// ---------------------------------------------------------------------
// COGS
// ---------------------------------------------------------------------

/**
 * Cost of goods sold for one online order.
 *
 * Reads item.purchasePrice - the snapshot frozen when the order was
 * placed - and NEVER data/product-costs.ts, which holds today's cost.
 * Using today's cost would rewrite the profit of every past sale each
 * time a supplier changed a price.
 */
export function calculateOrderCOGS(order: Order): number {
  return order.items.reduce(
    (sum, item) => sum + item.purchasePrice * item.quantity,
    0
  );
}

/** Same rule for a counter invoice. */
export function calculateInvoiceCOGS(invoice: Invoice): number {
  return invoice.items.reduce(
    (sum, line) => sum + line.purchasePrice * line.quantity,
    0
  );
}

// ---------------------------------------------------------------------
// Normalising both sales channels into one row type
// ---------------------------------------------------------------------

function orderToEntry(order: Order): RevenueEntry {
  const cogs = calculateOrderCOGS(order);
  return {
    reference: order.orderNumber,
    channel: "ONLINE",
    // placedAt, not updatedAt: the sale belongs to the day it was made.
    at: order.placedAt,
    customerId: order.customerId,
    customerName: order.customerName,
    revenue: order.total,
    cogs,
    grossProfit: order.total - cogs,
    // Cash in hand is a different question from revenue earned (§29).
    collected: order.paymentStatus === "paid" ? order.total : 0,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    statusLabel: ORDER_STATUS_CONFIG[order.status].label,
    statusClass: ORDER_STATUS_CONFIG[order.status].badgeClass,
    paymentLabel: PAYMENT_STATUS_CONFIG[order.paymentStatus].label,
    paymentClass: PAYMENT_STATUS_CONFIG[order.paymentStatus].badgeClass,
    href: `/admin/orders/${order.orderNumber}`,
  };
}

function invoiceToEntry(invoice: Invoice): RevenueEntry {
  const cogs = calculateInvoiceCOGS(invoice);
  const payment = PAYMENT_STATUS_STYLES[invoice.paymentStatus];
  return {
    reference: invoice.invoiceNumber,
    channel: "POS",
    at: invoice.createdAt,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    revenue: invoice.total,
    cogs,
    grossProfit: invoice.total - cogs,
    // A counter sale can be PARTIAL, so this is the real amount taken,
    // not the invoice total.
    collected: invoice.paidAmount,
    itemCount: invoice.items.reduce((n, l) => n + l.quantity, 0),
    statusLabel: "Completed",
    statusClass: "bg-success/10 text-success",
    paymentLabel: payment.label,
    paymentClass: payment.className,
    href: null, // counter invoices have no detail route yet
  };
}

/**
 * EVERY completed sale in the period, from both channels, as one list.
 *
 * This is the single source the revenue table, the chart, the P&L and
 * the dashboard all read. Nothing else may assemble its own sales list -
 * that is how double-counting starts.
 */
export function getRevenueEntries(
  orders: Order[],
  invoices: Invoice[],
  range?: DateRange
): RevenueEntry[] {
  const fromOrders = orders.filter(countsAsRevenue).map(orderToEntry);
  const fromInvoices = invoices.filter(invoiceCountsAsRevenue).map(invoiceToEntry);

  const all = [...fromOrders, ...fromInvoices];
  const inPeriod = range ? all.filter((e) => isWithinRange(e.at, range)) : all;

  return inPeriod.sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------
// The five figures
// ---------------------------------------------------------------------

export function calculateRevenue(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.revenue, 0);
}

export function calculateCOGS(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.cogs, 0);
}

export function calculateGrossProfit(entries: RevenueEntry[]): number {
  return calculateRevenue(entries) - calculateCOGS(entries);
}

export function calculateOperatingExpenses(
  expenses: Expense[],
  range?: DateRange
): number {
  return getTotalExpenses(expenses, range);
}

export function calculateNetProfit(
  entries: RevenueEntry[],
  expenses: Expense[],
  range?: DateRange
): number {
  return calculateGrossProfit(entries) - calculateOperatingExpenses(expenses, range);
}

/** Percentage of revenue, or null when there was no revenue to divide by. */
function margin(part: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (part / revenue) * 100;
}

/**
 * THE financial answer for a period.
 *
 * Both the dashboard and the P&L page call this. Pass the same range and
 * they cannot disagree.
 */
export function getFinancialSummary(
  orders: Order[],
  invoices: Invoice[],
  expenses: Expense[],
  range?: DateRange
): FinancialSummary {
  const entries = getRevenueEntries(orders, invoices, range);

  const revenue = calculateRevenue(entries);
  const cogs = calculateCOGS(entries);
  const grossProfit = revenue - cogs;
  const operatingExpenses = calculateOperatingExpenses(expenses, range);
  const netProfit = grossProfit - operatingExpenses;
  const collected = entries.reduce((sum, e) => sum + e.collected, 0);

  return {
    revenue,
    cogs,
    grossProfit,
    expenses: operatingExpenses,
    netProfit,
    grossMargin: margin(grossProfit, revenue),
    netMargin: margin(netProfit, revenue),
    saleCount: entries.length,
    collected,
    outstanding: revenue - collected,
  };
}

/** The same totals, split by channel and expense category (§23). */
export function getFinancialBreakdown(
  orders: Order[],
  invoices: Invoice[],
  expenses: Expense[],
  range?: DateRange
): FinancialBreakdown {
  const summary = getFinancialSummary(orders, invoices, expenses, range);
  const entries = getRevenueEntries(orders, invoices, range);

  const blank = (): Record<SalesChannel, number> => ({ POS: 0, ONLINE: 0 });
  const revenueByChannel = blank();
  const cogsByChannel = blank();
  const grossProfitByChannel = blank();

  for (const e of entries) {
    revenueByChannel[e.channel] += e.revenue;
    cogsByChannel[e.channel] += e.cogs;
    grossProfitByChannel[e.channel] += e.grossProfit;
  }

  return {
    ...summary,
    revenueByChannel,
    cogsByChannel,
    grossProfitByChannel,
    expensesByCategory: getExpensesByCategory(expenses, range),
  };
}

// ---------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------

/**
 * Revenue over time, bucketed by day or month.
 *
 * Every bucket in the range is emitted, including the empty ones, so a
 * quiet Tuesday shows as a dip rather than vanishing and making the
 * x-axis lie about how much time passed.
 */
export function buildRevenueSeries(
  entries: RevenueEntry[],
  range: DateRange,
  unit: BucketUnit
): RevenuePoint[] {
  const buckets: Bucket[] = buildBuckets(range, unit);

  const revenueByKey = new Map<string, number>();
  const profitByKey = new Map<string, number>();

  for (const e of entries) {
    const key = bucketKeyFor(e.at, unit);
    revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + e.revenue);
    profitByKey.set(key, (profitByKey.get(key) ?? 0) + e.grossProfit);
  }

  return buckets.map((b) => ({
    key: b.key,
    label: b.label,
    revenue: revenueByKey.get(b.key) ?? 0,
    grossProfit: profitByKey.get(b.key) ?? 0,
  }));
}

// ---------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------

/**
 * A margin, or a dash when there is no revenue to take a share of.
 * Never "0%", which would claim the business broke exactly even.
 */
export function formatMargin(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

/**
 * WHY PURCHASES ARE NOT OPERATING EXPENSES
 * ========================================
 *
 * This is the single most important rule in this file, so it is written
 * down rather than left to be inferred.
 *
 * Say the shop buys 10 phones at Rs 50,000 each: Rs 500,000 out the
 * door. It is tempting to call that a Rs 500,000 expense. It is not.
 *
 * Nothing was consumed. The business swapped Rs 500,000 of cash for
 * Rs 500,000 of stock, and is exactly as wealthy as before. What it
 * created was:
 *
 *   - more INVENTORY          (lib/inventory-utils.ts)
 *   - a supplier PAYABLE      (Purchase.dueAmount)
 *   - a cash/bank movement    (Purchase.paidAmount)
 *
 * The cost only becomes a cost when a phone is SOLD - and then it
 * appears as COGS for that sale, at the price that phone actually cost,
 * via the purchasePrice snapshot on the sale line.
 *
 * If purchases were counted as operating expenses instead, then:
 *
 *   - restocking month:  huge "loss", though nothing was lost
 *   - selling-down month: huge "profit", though stock was consumed
 *
 * The reported profit would track when the shop happened to reorder
 * rather than how well it traded. Nine unsold phones still sitting on
 * the shelf are an asset, not a loss.
 *
 * This is also why getFinancialSummary() takes orders, invoices and
 * expenses - and never touches Purchase at all.
 */
