"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, PieChart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerPaymentsSection } from "@/components/admin/owners/OwnerPaymentsSection";
import { useOwners } from "@/context/OwnersContext";
import { formatOrderDateTime } from "@/lib/order-display";
import { cn } from "@/lib/utils";

export function OwnerDetailView({ ownerId }: { ownerId: string }) {
  const { getOwner, loading, isHydrated } = useOwners();
  const owner = getOwner(ownerId);

  // "Not here yet" and "not here" are different answers; showing the
  // second while the first is true is how a working page gets reported
  // as broken.
  if (!isHydrated || loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Users className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No such person</p>
        <p className="max-w-sm px-4 text-xs text-muted-foreground">
          They may have been removed, or this account may not be allowed to read
          owner records - only an owner or a manager can.
        </p>
        <Button asChild variant="outline" className="mt-1 h-9 gap-1.5 text-xs">
          <Link href="/admin/owners">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Owners
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
          <Link href="/admin/owners">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Owners
          </Link>
        </Button>
        <Button asChild className="h-9 gap-1.5 text-xs">
          <Link href={`/admin/owners/${owner.id}/edit`}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold text-primary">{owner.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{owner.role}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  owner.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {owner.status === "active" ? "Active" : "Inactive"}
              </span>
              {owner.sharePercent !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-secondary">
                  <PieChart className="size-3" aria-hidden="true" />
                  {owner.sharePercent}% share
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Contact</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <a href={`tel:${owner.phone}`} className="hover:text-secondary">
                  {owner.phone || "Not recorded"}
                </a>
              </li>
              {owner.email && (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <a href={`mailto:${owner.email}`} className="break-all hover:text-secondary">
                    {owner.email}
                  </a>
                </li>
              )}
              {owner.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-muted-foreground">{owner.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {owner.notes || (
              <span className="text-muted-foreground">Nothing recorded.</span>
            )}
          </p>

          <dl className="mt-6 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Added</dt>
              <dd className="mt-0.5 text-foreground">{formatOrderDateTime(owner.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Last updated
              </dt>
              <dd className="mt-0.5 text-foreground">{formatOrderDateTime(owner.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <OwnerPaymentsSection ownerId={owner.id} />
    </>
  );
}
