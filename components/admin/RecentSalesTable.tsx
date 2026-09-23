import Link from "next/link";
import { Receipt, ArrowRight, Store, Globe } from "lucide-react";
import { recentSales } from "@/data/admin";
import { formatPrice, cn } from "@/lib/utils";
import type { SaleStatus, SalesChannelId } from "@/types";

const STATUS_STYLES: Record<SaleStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/10 text-success" },
  pending: { label: "Pending", className: "bg-warning/15 text-gold-deep" },
  processing: { label: "Processing", className: "bg-cyan-soft text-secondary" },
  refunded: { label: "Refunded", className: "bg-destructive/10 text-destructive" },
};

const CHANNEL_STYLES: Record<
  SalesChannelId,
  { label: string; Icon: typeof Store; className: string }
> = {
  physical: {
    label: "Physical",
    Icon: Store,
    className: "bg-muted text-foreground",
  },
  online: {
    label: "Online",
    Icon: Globe,
    className: "bg-primary/10 text-primary",
  },
};

/**
 * The latest sales from BOTH channels in one list.
 *
 * That mixing is deliberate and is the clearest expression of the central
 * architecture: INV-xxxx came from the counter, ORD-xxxx came from the
 * website, and they sit in one table because they are rows of one sales
 * system - not two systems reconciled later.
 *
 * RESPONSIVE: table from lg up (six columns need real room), cards below.
 *
 * A Server Component.
 */
export function RecentSalesTable() {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-primary">
          <Receipt className="size-4 text-secondary" aria-hidden="true" />
          Recent Sales
        </h2>
        <Link
          href="/admin/orders"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-secondary transition-colors hover:text-primary"
        >
          View all
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* ---------- md and up: real table ---------- */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            The most recent sales from the shop counter and the online store
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 font-medium">Invoice</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Customer</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Channel</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentSales.map((sale) => (
              <tr key={sale.reference} className="transition-colors hover:bg-muted/40">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-primary">
                  #{sale.reference}
                </th>
                <td className="px-3 py-3 text-foreground">{sale.customerName}</td>
                <td className="px-3 py-3">
                  <ChannelBadge channel={sale.channel} />
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">
                  {formatPrice(sale.amount)}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{sale.date}</td>
                <td className="px-5 py-3 text-right">
                  <StatusBadge status={sale.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- below md: stacked cards ---------- */}
      <ul className="divide-y divide-border lg:hidden">
        {recentSales.map((sale) => (
          <li key={sale.reference} className="space-y-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary">#{sale.reference}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {sale.customerName} &middot; {sale.date}
                </p>
              </div>
              <StatusBadge status={sale.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <ChannelBadge channel={sale.channel} />
              <p className="font-heading font-bold tabular-nums text-primary">
                {formatPrice(sale.amount)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: SaleStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: SalesChannelId }) {
  const { label, Icon, className } = CHANNEL_STYLES[channel];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        className
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
