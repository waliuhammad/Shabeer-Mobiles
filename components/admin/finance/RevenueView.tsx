"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  Search,
  ArrowUpRight,
  Store,
  Globe,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/KpiCard";
import { PeriodFilter } from "@/components/admin/finance/PeriodFilter";
import { RevenueChart } from "@/components/admin/finance/RevenueChart";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { buildRevenueSeries, getRevenueEntries } from "@/lib/finance-utils";
import {
  REVENUE_PERIODS,
  bucketUnitFor,
  formatRangeLabel,
  isValidRange,
  resolvePeriod,
  toDateInputValue,
  type PeriodId,
} from "@/lib/date-range";
import { now } from "@/lib/demo-clock";
import { formatOrderDateTime } from "@/lib/order-display";
import { formatPrice, cn } from "@/lib/utils";
import { SALES_CHANNEL_LABELS, type SalesChannel } from "@/types";

/**
 * /admin/revenue.
 *
 * Every row here is a REAL sale - an Order that reached Delivered, or a
 * counter Invoice. Nothing on this page is a revenue record in its own
 * right, because a revenue record that exists separately from the sale
 * behind it is a revenue record that can disagree with it.
 *
 * Revenue is what was BILLED. Collected is what was actually taken. They
 * are shown side by side because on a part-paid counter sale they are
 * genuinely different numbers, and treating cash in the till as revenue
 * is one of the commonest ways a small business misreads its own books.
 */
export function RevenueView() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();

  const [period, setPeriod] = useState<PeriodId>("30d");
  const [customStart, setCustomStart] = useState(() =>
    toDateInputValue(new Date(now().getFullYear(), now().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(now()));

  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<SalesChannel | "all">("all");
  const [payment, setPayment] = useState<string>("all");

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  const rangeOk = isValidRange(range);

  /** Every completed sale in the period. THE source for this page. */
  const entries = useMemo(
    () => (rangeOk ? getRevenueEntries(orders, invoices, range) : []),
    [orders, invoices, range, rangeOk]
  );

  // Headline cards are fixed periods, deliberately independent of the
  // filter above - "Today's Revenue" must mean today whatever range is
  // being browsed.
  const headline = useMemo(() => {
    const forPeriod = (p: PeriodId) =>
      getRevenueEntries(orders, invoices, resolvePeriod(p)).reduce(
        (sum, e) => sum + e.revenue,
        0
      );
    return {
      today: forPeriod("today"),
      week: forPeriod("week"),
      month: forPeriod("month"),
      all: forPeriod("all"),
    };
  }, [orders, invoices]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (channel !== "all" && e.channel !== channel) return false;
      if (payment !== "all" && e.paymentLabel !== payment) return false;
      if (!q) return true;
      return (
        e.reference.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q)
      );
    });
  }, [entries, query, channel, payment]);

  const unit = bucketUnitFor(period, range);
  const series = useMemo(
    () => (rangeOk ? buildRevenueSeries(entries, range, unit) : []),
    [entries, range, unit, rangeOk]
  );

  const shown = useMemo(
    () => ({
      revenue: visible.reduce((s, e) => s + e.revenue, 0),
      collected: visible.reduce((s, e) => s + e.collected, 0),
    }),
    [visible]
  );

  const paymentLabels = useMemo(
    () => [...new Set(entries.map((e) => e.paymentLabel))].sort(),
    [entries]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Today's Revenue"
          value={formatPrice(headline.today)}
          Icon={Banknote}
          tone="navy"
          description="Completed sales today"
        />
        <KpiCard
          title="This Week"
          value={formatPrice(headline.week)}
          Icon={CalendarDays}
          tone="cyan"
          description="Monday to today"
        />
        <KpiCard
          title="This Month"
          value={formatPrice(headline.month)}
          Icon={CalendarRange}
          tone="gold"
          description="Calendar month to date"
        />
        <KpiCard
          title="Total Revenue"
          value={formatPrice(headline.all)}
          Icon={TrendingUp}
          tone="success"
          description="All completed sales"
        />
      </div>

      {/* ---------------- PERIOD ---------------- */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <PeriodFilter
          periods={REVENUE_PERIODS}
          value={period}
          onChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStart={setCustomStart}
          onCustomEnd={setCustomEnd}
          error={
            rangeOk ? undefined : "The end date is before the start date."
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {formatRangeLabel(range)} · {entries.length}{" "}
          {entries.length === 1 ? "sale" : "sales"}
        </p>
      </div>

      {/* ---------------- CHART ---------------- */}
      <div className="mt-4">
        <RevenueChart points={series} unitLabel={unit} />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-56">
          <label htmlFor="revenue-search" className="sr-only">
            Search by invoice, order number or customer
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="revenue-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice, order number or customer..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Select value={channel} onValueChange={(v) => setChannel(v as SalesChannel | "all")}>
          <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by sales channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="POS">Counter</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
          </SelectContent>
        </Select>

        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by payment status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Status</SelectItem>
            {paymentLabels.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Showing {visible.length} of {entries.length} sales
        </p>
        <p className="text-xs text-muted-foreground">
          Revenue{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatPrice(shown.revenue)}
          </span>{" "}
          · Collected{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatPrice(shown.collected)}
          </span>
        </p>
      </div>

      {/* ---------------- TABLE ---------------- */}
      {visible.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Banknote className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {rangeOk ? "No completed sales" : "Invalid date range"}
          </p>
          <p className="max-w-sm px-4 text-xs text-muted-foreground">
            {!rangeOk
              ? "The end date is before the start date, so no period could be worked out."
              : entries.length === 0
                ? "Nothing was sold in this period. Only delivered online orders and completed counter sales count as revenue - orders still in progress do not."
                : "No sale matches this search, channel or payment status."}
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Completed sales contributing to revenue
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Sale / Invoice</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Customer</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Channel</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((e) => (
                  <tr key={e.reference} className="transition-colors hover:bg-muted/40">
                    <th scope="row" className="px-4 py-3 text-left">
                      {e.href ? (
                        <Link
                          href={e.href}
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:text-secondary"
                        >
                          {e.reference}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {e.reference}
                        </span>
                      )}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {e.itemCount} {e.itemCount === 1 ? "item" : "items"}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-muted-foreground">
                      {e.customerId ? (
                        <Link
                          href={`/admin/customers/${e.customerId}`}
                          className="hover:text-secondary"
                        >
                          {e.customerName}
                        </Link>
                      ) : (
                        e.customerName
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                        {e.channel === "POS" ? (
                          <Store className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Globe className="size-3.5" aria-hidden="true" />
                        )}
                        {SALES_CHANNEL_LABELS[e.channel]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {formatOrderDateTime(e.at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatPrice(e.revenue)}
                      {e.collected < e.revenue && (
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {formatPrice(e.collected)} collected
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          e.paymentClass
                        )}
                      >
                        {e.paymentLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          e.statusClass
                        )}
                      >
                        {e.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* below lg: cards */}
          <ul className="divide-y divide-border lg:hidden">
            {visible.map((e) => (
              <li key={e.reference} className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-primary">
                      {e.reference}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.customerName} · {SALES_CHANNEL_LABELS[e.channel]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      e.paymentClass
                    )}
                  >
                    {e.paymentLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {formatOrderDateTime(e.at)}
                  </span>
                  <span className="font-heading text-base font-bold tabular-nums text-primary">
                    {formatPrice(e.revenue)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">Revenue</strong> is the
        total value of completed sales in the period - delivered online orders and
        counter invoices. Orders still being processed are not revenue yet, and
        cancelled or returned orders never become revenue.{" "}
        <strong className="font-semibold text-foreground">Collected</strong> is the
        cash actually taken, which is lower whenever a sale is part-paid.
      </p>
    </>
  );
}
