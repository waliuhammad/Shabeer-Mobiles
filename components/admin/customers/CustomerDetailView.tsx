"use client";

import { useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Wallet,
  CalendarClock,
  UserX,
  UserCheck,
  Receipt,
  Globe,
  Store,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/context/CustomersContext";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import {
  CUSTOMER_STATUS_CONFIG,
  calculateCustomerStats,
  getCustomerTransactions,
  isSystemCustomer,
} from "@/lib/customer-utils";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";

interface CustomerDetailViewProps {
  customerId: string;
}

/**
 * /admin/customers/[id].
 *
 * The complete picture of one customer: who they are, what they have
 * spent, and every transaction across BOTH channels in one table.
 *
 * That unified history is the whole reason for a single customer model.
 * With separate POS and online customer records, "how much has Ayesha
 * spent with us?" would have two answers and neither would be right.
 */
export function CustomerDetailView({ customerId }: CustomerDetailViewProps) {
  const { getCustomer, setCustomerStatus, isHydrated } = useCustomers();
  const { orders } = useOrders();
  const { invoices } = useInvoices();

  const customer = getCustomer(customerId);

  const stats = useMemo(
    () => calculateCustomerStats(customerId, orders, invoices),
    [customerId, orders, invoices]
  );

  const transactions = useMemo(
    () => getCustomerTransactions(customerId, orders, invoices),
    [customerId, orders, invoices]
  );

  // A customer created in this browser is unknown to the server render,
  // so wait for hydration before deciding an id is genuinely bad.
  if (!customer) {
    if (!isHydrated) return null;
    notFound();
  }

  const style = CUSTOMER_STATUS_CONFIG[customer.status];
  const isActive = customer.status === "ACTIVE";
  const isSystem = isSystemCustomer(customer);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/customers">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Customers
          </Link>
        </Button>

        {/* The walk-in row is a system record - it has no edit or
            deactivate actions because it is not a person. */}
        {!isSystem && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomerStatus(customer.id, isActive ? "INACTIVE" : "ACTIVE");
                toast.success(
                  isActive ? "Customer deactivated." : "Customer reactivated.",
                  { description: customer.name }
                );
              }}
              className="h-9 gap-1.5 text-xs"
            >
              {isActive ? (
                <>
                  <UserX className="size-3.5" aria-hidden="true" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="size-3.5" aria-hidden="true" />
                  Reactivate
                </>
              )}
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 gap-1.5 bg-accent text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <Link href={`/admin/customers/${customer.id}/edit`}>
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit Customer
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ---------------- HEADER ---------------- */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-accent">
              {initials(customer.name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-xl font-bold text-primary">
                {customer.name}
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                {customer.id}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customer since {formatOrderDate(customer.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stats.isRepeat && (
              <span className="rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-secondary">
                Repeat Customer
              </span>
            )}
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", style.badgeClass)}>
              {style.label}
            </span>
          </div>
        </div>

        {isSystem && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
            This is the system walk-in record, reused for every anonymous
            counter sale. It is not a person, so it cannot be edited or
            deactivated. When a cashier enters a real name and phone, a real
            customer record is created instead.
          </p>
        )}
      </section>

      {/* ---------------- STATS ---------------- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Total Orders"
          value={String(stats.orderCount)}
          hint="Online, excluding cancelled"
          Icon={ShoppingBag}
          tone="navy"
        />
        <Stat
          label="Counter Sales"
          value={String(stats.posSaleCount)}
          hint="Bought at the shop"
          Icon={Receipt}
          tone="cyan"
        />
        <Stat
          label="Total Spent"
          value={formatPrice(stats.totalSpent)}
          hint="At the prices charged"
          Icon={Wallet}
          tone="success"
        />
        <Stat
          label="Latest Order"
          value={
            stats.lastPurchaseAt ? formatOrderDate(stats.lastPurchaseAt) : "None"
          }
          hint={stats.lastPurchaseAt ? "Most recent online order" : "No orders yet"}
          Icon={CalendarClock}
          tone="gold"
        />
      </div>

      {/*
        NOTE ON WHAT IS NOT HERE: no cost, no margin, no profit. This
        screen shows what the customer PAID. What the shop made on them
        is finance data belonging behind a different role.
      */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Total Spent uses each transaction&apos;s own historical total, so it
        never changes when a product is repriced.
      </p>

      {/* ---------------- CONTACT + NOTES ---------------- */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-heading text-base font-bold text-primary">
            Contact Information
          </h3>
          <dl className="space-y-3">
            <Row Icon={Phone} label="Phone" value={customer.phone || "Not recorded"} />
            <Row Icon={Mail} label="Email" value={customer.email || "Not recorded"} />
            <Row Icon={MapPin} label="Address" value={customer.address || "Not recorded"} />
            <Row Icon={MapPin} label="City" value={customer.city || "Not recorded"} />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-heading text-base font-bold text-primary">Notes</h3>
          {customer.notes ? (
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes recorded for this customer.
            </p>
          )}
          <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            Internal only - never shown to the customer.
          </p>
        </section>
      </div>

      {/* ---------------- PURCHASE HISTORY ---------------- */}
      <section className="mt-5">
        <h3 className="mb-1 font-heading text-base font-bold text-primary">
          Purchase History
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Online orders and counter sales in one list - the point of a single
          customer record.
        </p>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-14 text-center">
            <ShoppingBag className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">No purchase history</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              This customer has not bought anything yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* lg and up: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Every order and counter sale for this customer
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Reference</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Items</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((t) => (
                    <tr key={`${t.kind}-${t.reference}`} className="transition-colors hover:bg-muted/40">
                      <th scope="row" className="px-4 py-3 text-left font-semibold text-primary">
                        {t.reference}
                      </th>
                      <td className="px-3 py-3">
                        <KindBadge kind={t.kind} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {t.at ? formatOrderDate(t.at) : t.statusLabel}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {t.itemCount || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatPrice(t.total)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", t.paymentClass)}>
                          {t.paymentLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {t.kind === "ONLINE_ORDER" ? (
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", t.statusClass)}>
                            {t.statusLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.href ? (
                          <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                            <Link href={t.href}>
                              <Eye className="size-3.5" aria-hidden="true" />
                              View
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            No detail page
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* below lg: cards */}
            <ul className="divide-y divide-border lg:hidden">
              {transactions.map((t) => (
                <li key={`${t.kind}-${t.reference}`} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">{t.reference}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.at ? formatOrderDate(t.at) : t.statusLabel}
                      </p>
                    </div>
                    <KindBadge kind={t.kind} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", t.paymentClass)}>
                      {t.paymentLabel}
                    </span>
                    <span className="font-heading text-base font-bold tabular-nums text-primary">
                      {formatPrice(t.total)}
                    </span>
                  </div>
                  {t.href && (
                    <Button asChild variant="outline" size="sm" className="h-9 w-full text-xs">
                      <Link href={t.href}>View</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function KindBadge({ kind }: { kind: "ONLINE_ORDER" | "POS_SALE" }) {
  const online = kind === "ONLINE_ORDER";
  const Icon = online ? Globe : Store;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        online ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {online ? "Online Order" : "POS Sale"}
    </span>
  );
}

const TONES = {
  navy: "bg-primary text-accent",
  cyan: "bg-cyan-soft text-secondary",
  gold: "bg-accent text-accent-foreground",
  success: "bg-success/10 text-success",
} as const;

function Stat({
  label,
  value,
  hint,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: typeof ShoppingBag;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className={cn("mb-2.5 flex size-9 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="font-heading text-lg font-bold tabular-nums text-primary sm:text-xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
