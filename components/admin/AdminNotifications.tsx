"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bell, PackageX, PackageMinus, Check, TriangleAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCatalog } from "@/context/CatalogContext";
import { cn } from "@/lib/utils";

/**
 * The admin notification bell.
 *
 * WHAT IT REPLACED
 * ----------------
 * A hard-coded `const unreadCount = 3` and a button with no click
 * handler. It showed "3" on a brand-new install with nothing in it, and
 * pressing it did nothing. That is worse than no bell at all: a badge
 * that is always wrong teaches the owner to ignore the one time it is
 * right.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * useCatalog(), which is an onSnapshot subscription on the products
 * collection. So this is live by construction: sell the last iPhone at
 * the counter and the badge changes on the owner's laptop without a
 * refresh, because the same write that moved the stock moved this.
 *
 * It deliberately opens NO subscription of its own. The topbar already
 * sits inside CatalogProvider, so reading from it costs nothing; a
 * second listener on the same collection would double the reads and
 * could briefly disagree with the inventory page.
 *
 * WHY THESE ALERTS AND NOT "MESSAGES"
 * -----------------------------------
 * A shop bell should carry what somebody has to act on today. Stock at
 * or below its threshold is exactly that - it is the difference between
 * reordering and turning a customer away. Online orders would belong
 * here too, but the shop does not sell online.
 *
 * NOT "UNREAD"
 * ------------
 * These are current conditions, not messages. An item is on the list
 * while it is short and leaves when it is restocked - there is nothing
 * to mark as read, and pretending otherwise would need a per-user store
 * that only ever produced a stale number. The label says "need
 * attention", which is what the count actually means.
 */

type AlertLevel = "out" | "low";

interface StockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  level: AlertLevel;
}

export function AdminNotifications() {
  const { products, loading, error } = useCatalog();

  const alerts = useMemo<StockAlert[]>(() => {
    const rows: StockAlert[] = [];

    for (const p of products) {
      // Drafts and archived products are not on sale, so being short of
      // them is not something to act on today.
      if (p.status !== "active") continue;

      const threshold = p.lowStockThreshold;
      let level: AlertLevel | null = null;

      if (p.stock <= 0) level = "out";
      else if (p.stock <= threshold) level = "low";

      if (!level) continue;

      rows.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        threshold,
        level,
      });
    }

    // Out of stock first - it is costing sales now, where low stock is a
    // warning about next week. Within a level, the emptiest shelf first.
    return rows.sort((a, b) => {
      if (a.level !== b.level) return a.level === "out" ? -1 : 1;
      return a.stock - b.stock;
    });
  }, [products]);

  const count = alerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // An icon-only button MUST carry an accessible name, and the
        // count belongs in it - "Notifications" alone would not tell a
        // screen reader user how many items are waiting.
        /**
         * "Nothing needs attention" is only said once we actually know.
         *
         * The first snapshot takes a moment to arrive, and until it does
         * the alert list is legitimately empty. Announcing an all-clear
         * in that window is the one wrong answer a stock alarm can give:
         * it says the shelves are fine before anything has been counted.
         */
        aria-label={
          loading
            ? "Notifications, checking stock"
            : error
              ? "Notifications, stock levels unavailable"
              : count > 0
                ? `Notifications, ${count} ${count === 1 ? "item needs" : "items need"} attention`
                : "Notifications, nothing needs attention"
        }
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
      >
        <Bell className="size-4.5" aria-hidden="true" />

        {/* Same reasoning as the label, for people who can see it: a bare
            bell reads as "all clear", so while the count is unknown it
            carries a neutral dot instead of nothing. */}
        {loading ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-muted-foreground/50"
          />
        ) : error ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-warning"
          />
        ) : (
          count > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-white"
            >
              {/* Past 9 the badge would stretch and unbalance the topbar,
                  and the exact number stops mattering - the list has it. */}
              {count > 9 ? "9+" : count}
            </span>
          )
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Needs attention</span>
          {count > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {error ? (
          <p className="flex items-start gap-2 px-3 py-4 text-xs leading-relaxed text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            Could not read stock levels. {error}
          </p>
        ) : loading ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">Checking stock...</p>
        ) : count === 0 ? (
          <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            Every product is above its stock threshold.
          </p>
        ) : (
          /* Capped height so a bad week does not produce a dropdown
             taller than the screen. */
          <ul className="max-h-80 overflow-y-auto py-1">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/inventory/${a.id}`}
                  className="flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                      a.level === "out"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {a.level === "out" ? (
                      <PackageX className="size-4" aria-hidden="true" />
                    ) : (
                      <PackageMinus className="size-4" aria-hidden="true" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {a.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {a.level === "out"
                        ? "Out of stock"
                        : `${a.stock} left - threshold is ${a.threshold}`}
                      {a.sku && ` · ${a.sku}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {count > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <Link
              href="/admin/inventory"
              className="block px-3 py-2.5 text-center text-xs font-medium text-secondary transition-colors hover:bg-muted"
            >
              Open Inventory
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
