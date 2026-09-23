"use client";

import { useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  User,
  Truck,
  Wallet,
  Receipt,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseTable } from "@/components/admin/purchases/PurchaseTable";
import { usePurchasing } from "@/context/PurchasingContext";
import { calculateSupplierTotals } from "@/lib/purchase-utils";
import { formatPrice, cn } from "@/lib/utils";

interface SupplierDetailViewProps {
  supplierId: string;
}

/**
 * /admin/suppliers/[id].
 *
 * The supplier record, its DERIVED balances, and every purchase made
 * from them - which is the Supplier -> Purchases relationship made
 * visible.
 */
export function SupplierDetailView({ supplierId }: SupplierDetailViewProps) {
  const { getSupplier, getSupplierPurchases, purchases } = usePurchasing();
  const supplier = getSupplier(supplierId);

  const totals = useMemo(
    () => calculateSupplierTotals(purchases, supplierId),
    [purchases, supplierId]
  );

  const history = useMemo(
    () =>
      [...getSupplierPurchases(supplierId)].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [getSupplierPurchases, supplierId]
  );

  // A supplier created in this browser is unknown to the server render,
  // so this only fires for a genuinely bad id after hydration.
  if (!supplier) notFound();

  const isActive = supplier.status === "active";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/suppliers">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Suppliers
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Link href={`/admin/suppliers/${supplier.id}/edit`}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit Supplier
            </Link>
          </Button>
          {isActive && (
            <Button
              asChild
              size="sm"
              className="h-9 gap-1.5 bg-accent text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <Link href="/admin/purchases/new">
                <Plus className="size-3.5" aria-hidden="true" />
                New Purchase
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ---------------- SUPPLIER INFO ---------------- */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-primary">
              {supplier.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {supplier.city || "No city recorded"}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isActive
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Row Icon={User} label="Contact Person" value={supplier.contactPerson || "Not recorded"} />
          <Row Icon={Phone} label="Phone" value={supplier.phone || "Not recorded"} />
          <Row Icon={Mail} label="Email" value={supplier.email || "Not recorded"} />
          <Row Icon={MapPin} label="Address" value={supplier.address || "Not recorded"} />
        </dl>

        {supplier.notes && (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            {supplier.notes}
          </p>
        )}

        {!isActive && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
            This supplier is inactive and will not appear when creating a new
            purchase. Their history below is kept deliberately - it explains
            where existing stock came from and what it cost.
          </p>
        )}
      </section>

      {/* ---------------- PURCHASE SUMMARY ---------------- */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat
          label="Total Purchases"
          value={formatPrice(totals.totalPurchased)}
          hint={`${totals.purchaseCount} received ${totals.purchaseCount === 1 ? "purchase" : "purchases"}`}
          Icon={Truck}
          tone="navy"
        />
        <Stat
          label="Total Paid"
          value={formatPrice(totals.totalPaid)}
          hint="Settled with this supplier"
          Icon={Receipt}
          tone="success"
        />
        <Stat
          label="Total Due"
          value={formatPrice(totals.totalDue)}
          hint="Outstanding payable"
          Icon={Wallet}
          tone={totals.totalDue > 0 ? "gold" : "cyan"}
        />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Totals count RECEIVED purchases only. Drafts are not yet owed for, and
        cancelled purchases never happened.
      </p>

      {/* ---------------- PURCHASE HISTORY ---------------- */}
      <section className="mt-5">
        <h2 className="mb-3 font-heading text-base font-bold text-primary">
          Purchase History
        </h2>
        <PurchaseTable purchases={history} showSupplier={false} />
      </section>
    </>
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
  Icon: typeof Truck;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className={cn("mb-2.5 flex size-9 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="font-heading text-xl font-bold tabular-nums text-primary">{value}</p>
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
  Icon: typeof User;
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
