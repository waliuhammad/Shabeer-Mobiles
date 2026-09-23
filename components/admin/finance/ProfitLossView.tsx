"use client";

import { useMemo, useState } from "react";
import { Info, Store, Globe, TriangleAlert } from "lucide-react";
import { PeriodFilter } from "@/components/admin/finance/PeriodFilter";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useExpenses } from "@/context/ExpensesContext";
import { getFinancialBreakdown, formatMargin } from "@/lib/finance-utils";
import {
  PROFIT_LOSS_PERIODS,
  formatRangeLabel,
  isValidRange,
  resolvePeriod,
  toDateInputValue,
  type PeriodId,
} from "@/lib/date-range";
import { now } from "@/lib/demo-clock";
import { formatPrice, cn } from "@/lib/utils";
import { SALES_CHANNEL_LABELS } from "@/types";

/**
 * /admin/profit-loss.
 *
 * The whole page is one statement, read top to bottom:
 *
 *     Revenue  -  COGS  =  Gross Profit  -  Expenses  =  Net Profit
 *
 * Nothing here is calculated locally. Every figure comes from
 * getFinancialBreakdown(), the same function the dashboard uses, so the
 * two cannot disagree.
 *
 * OWNER-ONLY in spirit: it exposes purchase costs and margins. The route
 * is already marked OWNER_ONLY in lib/admin-nav.ts, but that only hides
 * a link. Real enforcement arrives with Firebase Auth custom claims and
 * Security Rules - a hidden page is still a page anyone can type in.
 */
export function ProfitLossView() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();

  const [period, setPeriod] = useState<PeriodId>("month");
  const [customStart, setCustomStart] = useState(() =>
    toDateInputValue(new Date(now().getFullYear(), now().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(now()));

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  const rangeOk = isValidRange(range);

  const f = useMemo(
    () => getFinancialBreakdown(orders, invoices, expenses, range),
    [orders, invoices, expenses, range]
  );

  const loss = f.netProfit < 0;
  const noData = f.saleCount === 0 && f.expenses === 0;

  if (!rangeOk) {
    return (
      <>
        <PeriodPanel
          period={period}
          setPeriod={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          setCustomStart={setCustomStart}
          setCustomEnd={setCustomEnd}
          range={range}
          rangeOk={rangeOk}
          saleCount={0}
        />
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <TriangleAlert className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Invalid date range</p>
          <p className="max-w-sm px-4 text-xs text-muted-foreground">
            The end date is before the start date. Nothing is calculated, because a
            confident Rs 0 would be more misleading than no answer at all.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PeriodPanel
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        customEnd={customEnd}
        setCustomStart={setCustomStart}
        setCustomEnd={setCustomEnd}
        range={range}
        rangeOk={rangeOk}
        saleCount={f.saleCount}
      />

      {noData && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-px size-4 shrink-0 text-secondary" aria-hidden="true" />
          No sales and no expenses fall in this period, so every line below is
          genuinely zero - this is an empty period, not a broken calculation.
        </p>
      )}

      {/* ================= THE STATEMENT ================= */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <StatementRow
          label="Revenue"
          hint="Total value of completed sales during the selected period."
          amount={f.revenue}
          tone="plain"
          breakdown={[
            {
              label: `${SALES_CHANNEL_LABELS.POS} Sales`,
              amount: f.revenueByChannel.POS,
              Icon: Store,
            },
            {
              label: `${SALES_CHANNEL_LABELS.ONLINE} Sales`,
              amount: f.revenueByChannel.ONLINE,
              Icon: Globe,
            },
          ]}
        />

        <StatementRow
          label="Cost of Goods Sold"
          hint="Historical purchase cost of the products sold in this period. Unsold stock is not included - it is still inventory."
          amount={f.cogs}
          tone="negative"
          breakdown={[
            {
              label: `${SALES_CHANNEL_LABELS.POS} COGS`,
              amount: f.cogsByChannel.POS,
              Icon: Store,
            },
            {
              label: `${SALES_CHANNEL_LABELS.ONLINE} COGS`,
              amount: f.cogsByChannel.ONLINE,
              Icon: Globe,
            },
          ]}
        />

        <SubtotalRow
          label="Gross Profit"
          hint="Revenue minus cost of goods sold."
          amount={f.grossProfit}
          margin={`${formatMargin(f.grossMargin)} margin`}
        />

        <StatementRow
          label="Operating Expenses"
          hint="Business running costs recorded in this period - rent, bills, wages. Stock purchases are NOT here; they become COGS when sold."
          amount={f.expenses}
          tone="negative"
          breakdown={f.expensesByCategory.map((c) => ({
            label: c.label,
            amount: c.amount,
          }))}
          emptyBreakdown="No operating expenses recorded in this period."
        />

        {/* ---------------- NET PROFIT ---------------- */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-t-2 p-4 sm:p-5",
            loss
              ? "border-destructive/40 bg-destructive/5"
              : "border-success/40 bg-success/5"
          )}
        >
          <div>
            <p className="font-heading text-base font-bold text-foreground sm:text-lg">
              {loss ? "Net Loss" : "Net Profit"}
            </p>
            <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-muted-foreground">
              Gross profit minus operating expenses. This is what the business
              actually kept.
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "font-heading text-2xl font-bold tabular-nums sm:text-3xl",
                loss ? "text-destructive" : "text-success"
              )}
            >
              {/* Losses read "- Rs 1,234", never "Rs -1,234". */}
              {loss ? `- ${formatPrice(Math.abs(f.netProfit))}` : formatPrice(f.netProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatMargin(f.netMargin)} margin
            </p>
          </div>
        </div>
      </div>

      {/* ================= CASH vs REVENUE ================= */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="Sales Counted"
          value={String(f.saleCount)}
          hint="Completed sales in this period"
        />
        <MiniStat
          label="Cash Collected"
          value={formatPrice(f.collected)}
          hint="Money actually received - not the same as revenue"
        />
        <MiniStat
          label="Outstanding"
          value={formatPrice(f.outstanding)}
          hint="Billed but not yet collected"
        />
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-foreground">
            Stock purchases are not operating expenses.
          </strong>{" "}
          Buying Rs 500,000 of phones swaps cash for inventory of the same value -
          the business is no poorer for it. That cost only reaches this statement as
          cost of goods sold, and only for the units actually sold, at the price
          they actually cost. Counting purchases as expenses would show a heavy loss
          in every restocking month and a false profit in every month the shelves
          were run down.
        </span>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function PeriodPanel({
  period,
  setPeriod,
  customStart,
  customEnd,
  setCustomStart,
  setCustomEnd,
  range,
  rangeOk,
  saleCount,
}: {
  period: PeriodId;
  setPeriod: (p: PeriodId) => void;
  customStart: string;
  customEnd: string;
  setCustomStart: (v: string) => void;
  setCustomEnd: (v: string) => void;
  range: ReturnType<typeof resolvePeriod>;
  rangeOk: boolean;
  saleCount: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <PeriodFilter
        periods={PROFIT_LOSS_PERIODS}
        value={period}
        onChange={setPeriod}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStart={setCustomStart}
        onCustomEnd={setCustomEnd}
        error={rangeOk ? undefined : "The end date is before the start date."}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {formatRangeLabel(range)} · {saleCount} {saleCount === 1 ? "sale" : "sales"}
      </p>
    </div>
  );
}

interface BreakdownLine {
  label: string;
  amount: number;
  Icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

function StatementRow({
  label,
  hint,
  amount,
  tone,
  breakdown,
  emptyBreakdown,
}: {
  label: string;
  hint: string;
  amount: number;
  tone: "plain" | "negative";
  breakdown: BreakdownLine[];
  emptyBreakdown?: string;
}) {
  const lines = breakdown.filter((b) => b.amount !== 0);

  return (
    <div className="border-b border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        </div>
        <p
          className={cn(
            "font-heading text-lg font-bold tabular-nums",
            tone === "negative" ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {/* A cost is shown as a subtraction, so the arithmetic on the
              page matches the arithmetic in the code. */}
          {tone === "negative" ? `- ${formatPrice(amount)}` : formatPrice(amount)}
        </p>
      </div>

      {lines.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
          {lines.map((b) => (
            <li
              key={b.label}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                {b.Icon && <b.Icon className="size-3.5" aria-hidden />}
                <span className="truncate">{b.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {formatPrice(b.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        emptyBreakdown && (
          <p className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">
            {emptyBreakdown}
          </p>
        )
      )}
    </div>
  );
}

function SubtotalRow({
  label,
  hint,
  amount,
  margin,
}: {
  label: string;
  hint: string;
  amount: number;
  margin: string;
}) {
  const negative = amount < 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-4 sm:p-5">
      <div>
        <p className="font-heading text-sm font-bold text-foreground sm:text-base">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "font-heading text-xl font-bold tabular-nums",
            negative ? "text-destructive" : "text-primary"
          )}
        >
          {negative ? `- ${formatPrice(Math.abs(amount))}` : formatPrice(amount)}
        </p>
        <p className="text-xs text-muted-foreground">{margin}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
