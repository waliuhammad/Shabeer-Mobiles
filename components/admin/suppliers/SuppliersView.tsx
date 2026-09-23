"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Truck,
  Wallet,
  Search,
  Plus,
  Eye,
  Pencil,
  Building2,
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
import { usePurchasing } from "@/context/PurchasingContext";
import {
  calculateSupplierTotals,
  countsTowardPayables,
  filterSuppliers,
} from "@/lib/purchase-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { SupplierStatus } from "@/types";

const STATUS_STYLES: Record<SupplierStatus, { label: string; badgeClass: string }> = {
  active: { label: "Active", badgeClass: "bg-success/10 text-success" },
  inactive: { label: "Inactive", badgeClass: "bg-muted text-muted-foreground" },
};

/**
 * /admin/suppliers.
 *
 * Every financial figure is DERIVED from the purchase records, never
 * stored on the supplier. A stored balance stops matching the purchases
 * behind it the first time one changes.
 */
export function SuppliersView() {
  const { suppliers, purchases } = usePurchasing();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupplierStatus | "all">("all");

  /** Totals per supplier, counting RECEIVED purchases only. */
  const totalsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSupplierTotals>>();
    for (const s of suppliers) {
      map.set(s.id, calculateSupplierTotals(purchases, s.id));
    }
    return map;
  }, [suppliers, purchases]);

  const summary = useMemo(() => {
    const counted = purchases.filter(countsTowardPayables);
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === "active").length,
      purchases: counted.length,
      payable: counted.reduce((sum, p) => sum + p.dueAmount, 0),
    };
  }, [suppliers, purchases]);

  const visible = useMemo(
    () => filterSuppliers(suppliers, query, status),
    [suppliers, query, status]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Suppliers"
          value={String(summary.total)}
          Icon={Users}
          tone="navy"
          description="Including inactive"
        />
        <KpiCard
          title="Active Suppliers"
          value={String(summary.active)}
          Icon={UserCheck}
          tone="success"
          description="Available for new purchases"
        />
        <KpiCard
          title="Total Purchases"
          value={String(summary.purchases)}
          Icon={Truck}
          tone="cyan"
          description="Received purchases only"
        />
        <KpiCard
          title="Outstanding Payables"
          value={formatPrice(summary.payable)}
          Icon={Wallet}
          tone="gold"
          description="Owed across all suppliers"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="supplier-search" className="sr-only">
            Search by name, contact, phone or email
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="supplier-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, contact, phone or email..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as SupplierStatus | "all")}>
          <SelectTrigger className="h-10 sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          asChild
          className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/admin/suppliers/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Supplier
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {suppliers.length} suppliers
      </p>

      {/* ---------------- TABLE ---------------- */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Building2 className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">No suppliers match</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Try a different search or status.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Suppliers and their balances</caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Supplier</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Contact</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Phone</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Purchased</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Paid</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Due</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((s) => {
                    const t = totalsById.get(s.id);
                    const style = STATUS_STYLES[s.status];
                    return (
                      <tr key={s.id} className="transition-colors hover:bg-muted/40">
                        <th scope="row" className="px-4 py-3 text-left">
                          <Link
                            href={`/admin/suppliers/${s.id}`}
                            className="font-semibold text-primary hover:text-secondary"
                          >
                            {s.name}
                          </Link>
                          <span className="block text-[11px] text-muted-foreground">
                            {s.city}
                          </span>
                        </th>
                        <td className="px-3 py-3 text-foreground">{s.contactPerson || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                          {s.phone || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                          {formatPrice(t?.totalPurchased ?? 0)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {formatPrice(t?.totalPaid ?? 0)}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums",
                            (t?.totalDue ?? 0) > 0 ? "text-destructive" : "text-success"
                          )}
                        >
                          {formatPrice(t?.totalDue ?? 0)}
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
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                              <Link href={`/admin/suppliers/${s.id}`}>
                                <Eye className="size-3.5" aria-hidden="true" />
                                View
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                              <Link href={`/admin/suppliers/${s.id}/edit`}>
                                <Pencil className="size-3.5" aria-hidden="true" />
                                Edit
                              </Link>
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
              {visible.map((s) => {
                const t = totalsById.get(s.id);
                const style = STATUS_STYLES[s.status];
                return (
                  <li key={s.id} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-primary">
                          {s.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.contactPerson || "—"} &middot; {s.phone || "—"}
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

                    <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <dt className="text-muted-foreground">Purchased</dt>
                        <dd className="font-medium tabular-nums text-foreground">
                          {formatPrice(t?.totalPurchased ?? 0)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Paid</dt>
                        <dd className="font-medium tabular-nums text-foreground">
                          {formatPrice(t?.totalPaid ?? 0)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Due</dt>
                        <dd
                          className={cn(
                            "font-semibold tabular-nums",
                            (t?.totalDue ?? 0) > 0 ? "text-destructive" : "text-success"
                          )}
                        >
                          {formatPrice(t?.totalDue ?? 0)}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1.5 text-xs">
                        <Link href={`/admin/suppliers/${s.id}`}>View</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1.5 text-xs">
                        <Link href={`/admin/suppliers/${s.id}/edit`}>Edit</Link>
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
