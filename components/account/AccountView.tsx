"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Wallet,
  Heart,
  Sparkles,
  Info,
  MapPin,
  Mail,
  Phone,
  User,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccountSidebar,
  type AccountSection,
} from "@/components/account/AccountSidebar";
import { AccountStat } from "@/components/account/AccountStat";
import { RecentOrders } from "@/components/account/RecentOrders";
import { useWishlist } from "@/context/WishlistContext";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { getAllOrders, toCustomerOrders } from "@/lib/order-utils";
import { formatPrice } from "@/lib/utils";
import type { Order, SessionUser } from "@/types";

/**
 * The account dashboard.
 *
 * WHO THIS SHOWS: the REAL signed-in person. The `user` prop comes from
 * requireUser() in the page above, which verified the session cookie
 * with the Firebase Admin SDK - so this is a server-checked identity,
 * not a value the browser supplied.
 *
 * The demo customer that used to be hard-coded here is gone along with
 * the rest of the mock data.
 *
 * STILL OUTSTANDING: the ORDERS below are whatever this browser has in
 * localStorage, not a Firestore query filtered to this uid. Until that
 * migration happens, two different people signing in on the same machine
 * would see the same order list. Signing in is solved; per-user data is
 * not.
 */
export function AccountView({ user }: { user: SessionUser }) {
  const [section, setSection] = useState<AccountSection>("dashboard");

  // Google gives a name, email sign-up may not, phone sign-in gives
  // neither - so fall back rather than render an empty heading.
  const displayName = user.displayName ?? user.email ?? user.phone ?? "My Account";
  const { count: wishlistCount, isHydrated: wishlistReady } = useWishlist();

  /**
   * Orders include ones saved in localStorage, which the server cannot
   * read. A LAZY INITIALISER runs getAllOrders once, on the first render:
   * [] on the server (no window), the real list in the browser.
   *
   * That means the first browser render already differs from the server
   * HTML - which is safe only because every block below is gated on
   * `ordersReady`, so the hydration render emits exactly what the server
   * sent. Same rule the cart follows.
   */
  // Sanitised at the boundary: an account page must never carry the
  // shop's purchase cost. See toCustomerOrder in lib/order-utils.ts.
  const [orders] = useState<Order[]>(() => toCustomerOrders(getAllOrders()));
  const ordersReady = useIsHydrated();

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
      <AccountSidebar active={section} onSelect={setSection} />

      <div className="min-w-0 space-y-6">
        {/* Stated once, at the top, on every section. */}
        <p className="flex items-start gap-2 rounded-lg border border-secondary/30 bg-cyan-soft/60 p-3 text-xs leading-relaxed text-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          <span>
            <strong className="font-semibold">You are signed in.</strong> Your
            profile below is real. Orders are still read from this browser
            rather than from the database, so they are not yet private to
            your account.
          </span>
        </p>

        {section === "dashboard" && (
          <>
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-accent">
                  {initials(displayName)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-lg font-bold text-primary">
                    {displayName}
                  </h2>
                  {user.email && (
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  )}
                  {user.phone && (
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  )}
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                {user.isStaff ? `Staff account - ${user.role}` : "Customer account"}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <AccountStat
                label="Total Orders"
                value={ordersReady ? String(orders.length) : "-"}
                Icon={Package}
                tone="navy"
              />
              <AccountStat
                label="Total Spent"
                value={ordersReady ? formatPrice(totalSpent) : "-"}
                Icon={Wallet}
                tone="success"
              />
              <AccountStat
                label="Wishlist"
                value={wishlistReady ? String(wishlistCount) : "-"}
                Icon={Heart}
                tone="cyan"
              />
              <AccountStat
                label="Reward Points"
                value="0"
                Icon={Sparkles}
                tone="gold"
                hint="Loyalty scheme not built yet"
              />
            </div>

            {ordersReady ? (
              <RecentOrders orders={orders.slice(0, 5)} />
            ) : (
              <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
            )}
          </>
        )}

        {section === "orders" && (
          ordersReady ? (
            <RecentOrders orders={orders} title="My Orders" />
          ) : (
            <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
          )
        )}

        {section === "addresses" && (
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-heading text-lg font-bold text-primary">
              Saved Addresses
            </h2>

            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="size-4 text-secondary" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">Home</span>
                <span className="rounded-full bg-cyan-soft px-2 py-0.5 text-[11px] font-medium text-secondary">
                  Default
                </span>
              </div>
              <address className="text-sm not-italic leading-relaxed text-muted-foreground">
                {displayName}
                <br />
                House 14, Street 6, Gulgasht Colony
                <br />
                Multan, 60000
                <br />
                {user.phone ?? "Not set"}
              </address>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled
              className="mt-4 h-10 gap-2 px-4 text-sm font-medium"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Address
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Saving addresses needs a signed-in account - Phase 2.
            </p>
          </section>
        )}

        {section === "profile" && (
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-heading text-lg font-bold text-primary">
              Profile Details
            </h2>

            <dl className="space-y-4">
              <ProfileRow Icon={User} label="Full Name" value={displayName} />
              <ProfileRow Icon={Mail} label="Email" value={user.email ?? "Not set"} />
              <ProfileRow Icon={Phone} label="Phone" value={user.phone ?? "Not set"} />
            </dl>

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <Button type="button" variant="outline" disabled className="h-10 px-4 text-sm font-medium">
                Edit Profile
              </Button>
              <Button asChild variant="outline" className="h-10 px-4 text-sm font-medium">
                <Link href="/login">Sign in to edit</Link>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Editing writes to a Firestore customer document - Phase 2.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* --- Local helpers, used only here --- */

function ProfileRow({
  Icon,
  label,
  value,
}: {
  Icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
