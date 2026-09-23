import type { ExpenseCategoryTotal } from "@/types/expense";

/**
 * The shapes the finance layer returns.
 *
 * THE CHAIN, top to bottom, is the only accounting model this project
 * uses and every page renders the same one:
 *
 *     Revenue
 *   - COGS
 *   = Gross Profit
 *   - Operating Expenses
 *   = Net Profit
 *
 * What must never appear anywhere: Net Profit = Sales - Purchases. That
 * treats unsold stock as if it had been consumed, which makes a good
 * restocking month look like a disaster and an empty-shelves month look
 * like a triumph.
 */

/** Which side of the business a sale came from. */
export type SalesChannel = "POS" | "ONLINE";

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  POS: "Counter",
  ONLINE: "Online",
};

/**
 * ONE completed sale, flattened from either an Order or an Invoice.
 *
 * Both sides are normalised into this shape so that revenue, COGS and
 * the chart have a single row type to work with, instead of every
 * function branching on "is this an order or an invoice".
 */
export interface RevenueEntry {
  /** "SM-1004" for an order, "SM-INV-0007" for a counter invoice. */
  reference: string;
  channel: SalesChannel;
  /** ISO. The moment the sale was recognised. */
  at: string;

  customerId: string | null;
  customerName: string;

  /** What the customer was charged, after discount. */
  revenue: number;
  /** Historical cost of the goods on this sale. */
  cogs: number;
  /** revenue - cogs. Stored on the row so tables need no maths. */
  grossProfit: number;

  /** Cash actually collected. NOT the same as revenue (see §29). */
  collected: number;

  itemCount: number;

  statusLabel: string;
  statusClass: string;
  paymentLabel: string;
  paymentClass: string;

  /** Detail route, or null when the record has no page yet. */
  href: string | null;
}

/** What getFinancialSummary returns. The single financial answer. */
export interface FinancialSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;

  /** grossProfit / revenue as a percentage, or null when revenue is 0. */
  grossMargin: number | null;
  netMargin: number | null;

  /** How many completed sales produced these figures. */
  saleCount: number;
  /** Cash collected in the period - a different question from revenue. */
  collected: number;
  /** Revenue billed but not yet collected. */
  outstanding: number;
}

/** The §23 breakdown: the same totals, split by where they came from. */
export interface FinancialBreakdown extends FinancialSummary {
  revenueByChannel: Record<SalesChannel, number>;
  cogsByChannel: Record<SalesChannel, number>;
  grossProfitByChannel: Record<SalesChannel, number>;
  expensesByCategory: ExpenseCategoryTotal[];
}

/** One point on the Revenue Over Time chart. */
export interface RevenuePoint {
  key: string;
  label: string;
  revenue: number;
  grossProfit: number;
}
