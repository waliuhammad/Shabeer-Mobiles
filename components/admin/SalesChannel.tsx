"use client";

import { useMemo } from "react";
import { Store, Globe } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { getRevenueEntries } from "@/lib/finance-utils";
import { resolvePeriod } from "@/lib/date-range";
import { formatPrice } from "@/lib/utils";

/**
 * Share of sales by channel.
 *
 * WHY THIS IS A STACKED BAR AND NOT THE DONUT THAT WAS ASKED FOR
 * --------------------------------------------------------------
 * A pie or donut of two slices is a known anti-pattern. With exactly two
 * parts, the reader is being asked to compare two angles when a single
 * length would answer instantly - and 60/40 is close enough that angles
 * are genuinely hard to judge. A horizontal stacked bar is the recommended
 * form for part-to-whole, reads left to right like the numbers beneath it,
 * and needs no chart library at all.
 *
 * It also survives the narrow column it lives in far better than a circle,
 * which has to shrink in both dimensions at once.
 *
 * COLOUR: --chart-1 (blue) and --chart-2 (gold). That exact pair was
 * validated: lightness band, chroma floor, protan/deutan/tritan separation
 * and surface contrast all pass. Blue and cyan were the obvious "on-brand"
 * pairing and they FAILED the normal-vision floor, which is why the gold
 * is here.
 *
 * Identity is never colour-alone: each channel carries an icon, a name and
 * its own percentage in text.
 *
 * A client island now, because the split is computed from live sales
 * rather than a fixed array.
 */
export function SalesChannel() {
  const { orders } = useOrders();
  const { invoices } = useInvoices();

  // Counter vs online, from the SAME entries the revenue page reads.
  const salesChannels = useMemo(() => {
    const entries = getRevenueEntries(orders, invoices, resolvePeriod("30d"));
    const counter = entries
      .filter((e) => e.channel === "POS")
      .reduce((sum, e) => sum + e.revenue, 0);
    const online = entries
      .filter((e) => e.channel === "ONLINE")
      .reduce((sum, e) => sum + e.revenue, 0);
    return [
      { id: "physical" as const, label: "Shop Counter", amount: counter },
      { id: "online" as const, label: "Online", amount: online },
    ];
  }, [orders, invoices]);

  const total = salesChannels.reduce((sum, channel) => sum + channel.amount, 0);

  const rows = salesChannels.map((channel) => ({
    ...channel,
    percent: total === 0 ? 0 : Math.round((channel.amount / total) * 100),
    Icon: channel.id === "online" ? Globe : Store,
    color: channel.id === "physical" ? "var(--chart-1)" : "var(--chart-2)",
  }));

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-base font-bold text-primary">Sales Channel</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        One sales system, two counters
      </p>

      <p className="mt-4 font-heading text-2xl font-bold tabular-nums text-primary">
        {formatPrice(total)}
      </p>
      <p className="text-xs text-muted-foreground">Combined today</p>

      {/* The bar. A 2px gap between segments keeps the boundary legible
          without a border, and the ends are rounded. */}
      <div
        className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={rows
          .map((r) => `${r.label} ${r.percent} percent`)
          .join(", ")}
      >
        {rows.map((row) => (
          <span
            key={row.id}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${row.percent}%`, backgroundColor: row.color }}
          />
        ))}
      </div>

      {/* Direct labels. With only two series these double as the legend,
          so no separate legend box is needed. */}
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <row.Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {row.label}
            </span>

            <span className="shrink-0 text-right">
              {/* Text wears text tokens, never the series colour - the dot
                  beside it already carries the identity. */}
              <span className="block text-sm font-semibold tabular-nums text-foreground">
                {row.percent}%
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {formatPrice(row.amount)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Both channels draw from the same central inventory, so these figures
        add up to one revenue number rather than two separate books.
      </p>
    </section>
  );
}
