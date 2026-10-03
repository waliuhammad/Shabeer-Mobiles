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
  Building2,
  Phone,
  Mail,
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

      {/* ---------------- CARDS ----------------
          The same card the Owners page uses, so the two directories read
          alike: name and who you speak to on top, numbers you can tap to
          dial, and the whole card opens the record. The money line under
          it is what a supplier card has that an owner card does not. */}
      {visible.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">No suppliers match</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Try a different search or status.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {visible.map((s) => {
            const t = totalsById.get(s.id);
            const due = t?.totalDue ?? 0;
            return (
              <li
                key={s.id}
                className={cn(
                  "relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-secondary/40",
                  s.status === "inactive" && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-primary">
                      {/* Stretched link: the whole card opens the supplier. */}
                      <Link
                        href={`/admin/suppliers/${s.id}`}
                        className="after:absolute after:inset-0 after:content-[''] hover:text-secondary"
                      >
                        {s.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[s.contactPerson, s.city].filter(Boolean).join(" · ") || "Supplier"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {due > 0 && (
                      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                        {formatPrice(due)} due
                      </span>
                    )}
                    {s.status === "inactive" && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {s.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                      {/* Above the card overlay, so tapping the number on a
                          phone dials instead of opening the record. */}
                      <a href={`tel:${s.phone}`} className="relative z-10 hover:text-secondary">
                        {s.phone}
                      </a>
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                      <a href={`mailto:${s.email}`} className="relative z-10 truncate hover:text-secondary">
                        {s.email}
                      </a>
                    </p>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
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
                        due > 0 ? "text-destructive" : "text-success"
                      )}
                    >
                      {formatPrice(due)}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
