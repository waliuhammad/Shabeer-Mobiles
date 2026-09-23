/**
 * Admin dashboard types.
 *
 * WHERE THESE NUMBERS WILL REALLY COME FROM
 * -----------------------------------------
 * Everything here is a DEMO value today. None of it is calculated. The real
 * derivations, once Firestore holds actual records, are:
 *
 *   Revenue      = sum of `sales.total` for the period
 *   COGS         = sum of (purchasePrice x quantity) for those sale lines
 *   Gross Profit = Revenue - COGS
 *   Net Profit   = Gross Profit - Expenses
 *   Stock Value  = sum of (purchasePrice x stock) across products
 *
 * Note that THREE of those five need `purchasePrice`, which is exactly the
 * field a cashier must never receive. That is why these figures will be
 * computed by trusted server code and delivered as finished numbers, rather
 * than by shipping raw cost data to the browser and adding it up there.
 */

/** Which business channel a sale came through. ONE system, two entry points. */
export type SalesChannelId = "online" | "physical";

/** Payment/fulfilment state shown on the recent sales table. */
export type SaleStatus = "paid" | "pending" | "processing" | "refunded";

/** How urgent a low-stock situation is. */
export type StockLevel = "low" | "critical" | "out-of-stock";

/** One KPI tile on the dashboard. */
export interface DashboardStat {
  id: string;
  label: string;
  /** Pre-formatted for display - the card does no maths of its own. */
  value: string;
  /** Percentage change vs the comparison period. Negative is a fall. */
  changePercent: number;
  /** What the change is measured against, e.g. "from yesterday". */
  changeLabel: string;
}

/** One point on the revenue-over-time chart. */
export interface SalesPoint {
  /** Axis label: "Mon", "Week 1", "Jan" - whatever the range needs. */
  label: string;
  revenue: number;
}

/** The ranges the Sales Overview filter offers. */
export type SalesRangeId = "today" | "7d" | "30d" | "3m" | "1y";

export interface SalesRange {
  id: SalesRangeId;
  label: string;
  points: SalesPoint[];
}

/** Share of sales by channel. */
export interface SalesChannelDatum {
  id: SalesChannelId;
  label: string;
  amount: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  /** Current quantity in CENTRAL inventory - not a per-channel number. */
  stock: number;
  lowStockThreshold: number;
  level: StockLevel;
}

export interface RecentSale {
  /** INV-xxxx for a counter sale, ORD-xxxx for an online order. */
  reference: string;
  /** Links to the central customer record. null for an anonymous sale. */
  customerId: string | null;
  customerName: string;
  channel: SalesChannelId;
  amount: number;
  /** Human relative date for the demo, e.g. "Today", "Yesterday". */
  date: string;
  status: SaleStatus;
}
