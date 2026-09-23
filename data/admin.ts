import type {
  DashboardStat,
  LowStockProduct,
  RecentSale,
  SalesChannelDatum,
  SalesRange,
  SalesRangeId,
} from "@/types";

/**
 * Phase 1C stand-in for the admin dashboard's numbers.
 *
 * EVERY VALUE HERE IS INVENTED. Nothing is calculated from the products,
 * orders or sales elsewhere in the project, and it deliberately is not -
 * a half-real dashboard is worse than an obviously fake one, because you
 * stop being able to tell which figures you can trust.
 *
 * PHASE 2+ replaces this file with services/admin.service.ts, which will
 * aggregate real Firestore records ON THE SERVER and return these same
 * shapes. The components consume the shapes, not the source, so that swap
 * touches no UI.
 */

export const dashboardStats: DashboardStat[] = [
  // Cleared. Real records are entered through the admin panel.
];

/**
 * Revenue over time, one dataset per range.
 *
 * Keyed by range so the filter is a lookup rather than a recalculation -
 * the UI stays a pure switch between prepared datasets. Later, each key
 * becomes a Firestore aggregation over a different date window.
 */
export const salesRanges: Record<SalesRangeId, SalesRange> = {
  today: {
    id: "today",
    label: "Today",
    points: [
      { label: "9am", revenue: 3200 },
      { label: "11am", revenue: 7400 },
      { label: "1pm", revenue: 11800 },
      { label: "3pm", revenue: 9600 },
      { label: "5pm", revenue: 14200 },
      { label: "7pm", revenue: 18900 },
      { label: "9pm", revenue: 12300 },
    ],
  },
  "7d": {
    id: "7d",
    label: "7 Days",
    points: [
      { label: "Mon", revenue: 38000 },
      { label: "Tue", revenue: 42500 },
      { label: "Wed", revenue: 35800 },
      { label: "Thu", revenue: 51200 },
      { label: "Fri", revenue: 64900 },
      { label: "Sat", revenue: 78300 },
      { label: "Sun", revenue: 50000 },
    ],
  },
  "30d": {
    id: "30d",
    label: "30 Days",
    points: [
      { label: "Week 1", revenue: 246000 },
      { label: "Week 2", revenue: 289500 },
      { label: "Week 3", revenue: 271200 },
      { label: "Week 4", revenue: 318700 },
    ],
  },
  "3m": {
    id: "3m",
    label: "3 Months",
    points: [
      { label: "Jul", revenue: 1042000 },
      { label: "Aug", revenue: 1187500 },
      { label: "Sep", revenue: 1125400 },
    ],
  },
  "1y": {
    id: "1y",
    label: "1 Year",
    points: [
      { label: "Oct", revenue: 842000 },
      { label: "Nov", revenue: 961000 },
      { label: "Dec", revenue: 1284000 },
      { label: "Jan", revenue: 903000 },
      { label: "Feb", revenue: 878000 },
      { label: "Mar", revenue: 1012000 },
      { label: "Apr", revenue: 1096000 },
      { label: "May", revenue: 1158000 },
      { label: "Jun", revenue: 1204000 },
      { label: "Jul", revenue: 1042000 },
      { label: "Aug", revenue: 1187500 },
      { label: "Sep", revenue: 1125400 },
    ],
  },
};

/** Display order for the range filter. */
export const salesRangeOrder: SalesRangeId[] = ["today", "7d", "30d", "3m", "1y"];

/**
 * Where sales came from.
 *
 * This split is the whole point of the central architecture: the counter
 * and the website are two doors into ONE sales system, so a single figure
 * can be broken down by channel instead of living in two separate books.
 */
export const salesChannels: SalesChannelDatum[] = [
  // Cleared. Real records are entered through the admin panel.
];

export const lowStockProducts: LowStockProduct[] = [
  // Cleared. Real records are entered through the admin panel.
];

export const recentSales: RecentSale[] = [
  // Cleared. Real records are entered through the admin panel.
];
