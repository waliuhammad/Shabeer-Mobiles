"use client";

import Link from "next/link";
import { Plus, Users, Phone, Mail, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwners } from "@/context/OwnersContext";
import { totalSharePercent } from "@/lib/owner-utils";
import { cn } from "@/lib/utils";

/**
 * Everyone with a stake in the shop or the building.
 *
 * Deliberately a plain list rather than a filtered, searchable table:
 * there are two working owners and a handful of plaza people. Search
 * boxes over five rows are furniture.
 */
export function OwnersView() {
  const { owners, loading, isHydrated } = useOwners();

  const total = totalSharePercent(owners);
  const active = owners.filter((o) => o.status === "active");

  if (!isHydrated || loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {active.length} active
          {owners.length !== active.length && ` · ${owners.length - active.length} inactive`}
          {total > 0 && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1">
                <PieChart className="size-3" aria-hidden="true" />
                shares total {total.toFixed(total % 1 === 0 ? 0 : 1)}%
              </span>
            </>
          )}
        </p>
        <Button asChild className="h-9 gap-1.5 text-xs">
          <Link href="/admin/owners/new">
            <Plus className="size-3.5" aria-hidden="true" />
            Add person
          </Link>
        </Button>
      </div>

      {owners.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Nobody recorded yet</p>
          <p className="max-w-sm px-4 text-xs text-muted-foreground">
            Add the shop&apos;s owners and the people who own the plaza, so their
            details are somewhere other than a phone contacts list.
          </p>
          <Button asChild className="mt-1 h-9 gap-1.5 text-xs">
            <Link href="/admin/owners/new">
              <Plus className="size-3.5" aria-hidden="true" />
              Add the first
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {owners.map((o) => (
            <li
              key={o.id}
              className={cn(
                "relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-secondary/40",
                o.status === "inactive" && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-primary">
                    {/* Stretched link: the whole card opens the person. */}
                    <Link
                      href={`/admin/owners/${o.id}`}
                      className="after:absolute after:inset-0 after:content-[''] hover:text-secondary"
                    >
                      {o.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{o.role}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {o.sharePercent !== null && (
                    <span className="rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-secondary">
                      {o.sharePercent}%
                    </span>
                  )}
                  {o.status === "inactive" && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {o.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                    {/* Above the card overlay, so tapping the number on a
                        phone dials instead of opening the record. */}
                    <a href={`tel:${o.phone}`} className="relative z-10 hover:text-secondary">
                      {o.phone}
                    </a>
                  </p>
                )}
                {o.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                    <a href={`mailto:${o.email}`} className="relative z-10 truncate hover:text-secondary">
                      {o.email}
                    </a>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        This is a contact record, not an access list. Who can sign in to this
        panel is set separately with scripts/set-role.mjs, so adding somebody
        here gives them nothing and removing them takes nothing away.
      </p>
    </>
  );
}
