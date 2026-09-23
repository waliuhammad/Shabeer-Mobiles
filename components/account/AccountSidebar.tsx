"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  MapPin,
  Heart,
  User,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Which account section is showing. */
export type AccountSection = "dashboard" | "orders" | "addresses" | "profile";

interface NavItem {
  id: AccountSection;
  label: string;
  Icon: LucideIcon;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "orders", label: "My Orders", Icon: Package },
  { id: "addresses", label: "Addresses", Icon: MapPin },
  { id: "profile", label: "Profile", Icon: User },
];

interface AccountSidebarProps {
  active: AccountSection;
  onSelect: (section: AccountSection) => void;
}

/**
 * The account navigation.
 *
 * Controlled, like CategoryFilter: it renders whatever `active` says and
 * reports clicks upward. The section state lives in AccountView so the
 * desktop sidebar and the mobile tab strip are driven by ONE value and
 * cannot disagree.
 *
 * Wishlist and Logout are the two exceptions - Wishlist is a real separate
 * route, and Logout is an action, so both are links/buttons rather than
 * section switches.
 */
export function AccountSidebar({ active, onSelect }: AccountSidebarProps) {
  return (
    <nav aria-label="Account sections" className="lg:sticky lg:top-28">
      {/*
        RESPONSIVE: a horizontally scrolling tab strip on mobile, a vertical
        sidebar from lg up. Same markup, different flex direction - no
        duplicated list.
      */}
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id} className="shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-accent" : "text-secondary"
                  )}
                  aria-hidden="true"
                />
                {label}
              </button>
            </li>
          );
        })}

        <li className="shrink-0 lg:w-full">
          <Link
            href="/wishlist"
            className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Heart className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            Wishlist
          </Link>
        </li>

        <li className="shrink-0 lg:mt-2 lg:w-full lg:border-t lg:border-border lg:pt-2">
          <Link
            href="/login"
            className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Logout
          </Link>
        </li>
      </ul>
    </nav>
  );
}
