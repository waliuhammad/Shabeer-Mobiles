"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  Repeat,
  Search,
  Plus,
  Eye,
  Pencil,
  UserX,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/KpiCard";
import { useCustomers } from "@/context/CustomersContext";
import { useOrders } from "@/context/OrdersContext";
import { useInvoices } from "@/context/InvoicesContext";
import {
  CUSTOMER_STATUS_CONFIG,
  calculateCustomerStats,
  calculateCustomerSummary,
  searchCustomers,
} from "@/lib/customer-utils";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { CustomerStatus } from "@/types";

/**
 * /admin/customers.
 *
 * Every figure - order count, total spent, repeat status - is DERIVED
 * from the actual orders and counter sales. Nothing is stored on the
 * customer record, so a number here can never disagree with the
 * transactions behind it.
 */
export function CustomersView() {
  const { people, setCustomerStatus } = useCustomers();
  const { orders } = useOrders();
  const { invoices } = useInvoices();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");

  const statsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCustomerStats>>();
    for (const c of people) {
      map.set(c.id, calculateCustomerStats(c.id, orders, invoices));
    }
    return map;
  }, [people, orders, invoices]);

  const summary = useMemo(
    () => calculateCustomerSummary(people, orders, invoices),
    [people, orders, invoices]
  );

  const visible = useMemo(
    () => searchCustomers(people, query, status),
    [people, query, status]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Customers"
          value={String(summary.total)}
          Icon={Users}
          tone="navy"
          description="Excluding the walk-in record"
        />
        <KpiCard
          title="Active Customers"
          value={String(summary.active)}
          Icon={UserCheck}
          tone="success"
          description="Available for new business"
        />
        <KpiCard
          title="New This Month"
          value={String(summary.newThisMonth)}
          Icon={UserPlus}
          tone="cyan"
          description="First recorded this month"
        />
        <KpiCard
          title="Repeat Customers"
          value={String(summary.repeat)}
          Icon={Repeat}
          tone="gold"
          description="Two or more purchases"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="customer-search" className="sr-only">
            Search by name, phone or email
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="customer-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or email..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus | "all")}>
          <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          asChild
          className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/admin/customers/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Customer
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {people.length} customers
      </p>

      {/* ---------------- TABLE ---------------- */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UserRound className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">
              {people.length === 0 ? "No customers yet" : "No customers match"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {people.length === 0
                ? "Add a customer, or create one from the POS during a sale."
                : "Try a different search or status."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Customers with their purchase history
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Phone</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Email</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">City</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Orders</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total Spent</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Created</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((c) => {
                    const stats = statsById.get(c.id);
                    const style = CUSTOMER_STATUS_CONFIG[c.status];
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-muted/40">
                        <th scope="row" className="px-4 py-3 text-left">
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="font-semibold text-primary hover:text-secondary"
                          >
                            {c.name}
                          </Link>
                          {stats?.isRepeat && (
                            <span className="ml-1.5 rounded-full bg-cyan-soft px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                              Repeat
                            </span>
                          )}
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {c.id}
                          </span>
                        </th>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                          {c.phone || "—"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="block max-w-[12rem] truncate">
                            {c.email || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{c.city || "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-foreground">
                          {stats?.totalTransactions ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatPrice(stats?.totalSpent ?? 0)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              style.badgeClass
                            )}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                          {formatOrderDate(c.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                              <Link href={`/admin/customers/${c.id}`}>
                                <Eye className="size-3.5" aria-hidden="true" />
                                View
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                              <Link href={`/admin/customers/${c.id}/edit`}>
                                <Pencil className="size-3.5" aria-hidden="true" />
                                Edit
                              </Link>
                            </Button>
                            {/* Deactivate, never delete. */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCustomerStatus(
                                  c.id,
                                  c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                                )
                              }
                              aria-label={
                                c.status === "ACTIVE"
                                  ? `Deactivate ${c.name}`
                                  : `Reactivate ${c.name}`
                              }
                              className="h-8 gap-1 px-2 text-xs"
                            >
                              {c.status === "ACTIVE" ? (
                                <UserX className="size-3.5" aria-hidden="true" />
                              ) : (
                                <UserCheck className="size-3.5" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* below lg: cards */}
            <ul className="divide-y divide-border lg:hidden">
              {visible.map((c) => {
                const stats = statsById.get(c.id);
                const style = CUSTOMER_STATUS_CONFIG[c.status];
                return (
                  <li key={c.id} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/customers/${c.id}`} className="font-semibold text-primary">
                          {c.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.phone || "—"}
                          {c.city ? ` · ${c.city}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          style.badgeClass
                        )}
                      >
                        {style.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {stats?.totalTransactions ?? 0}{" "}
                        {(stats?.totalTransactions ?? 0) === 1 ? "purchase" : "purchases"}
                      </span>
                      <span className="font-heading text-base font-bold tabular-nums text-primary">
                        {formatPrice(stats?.totalSpent ?? 0)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                        <Link href={`/admin/customers/${c.id}`}>View</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                        <Link href={`/admin/customers/${c.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
