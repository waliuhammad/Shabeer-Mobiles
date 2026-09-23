"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Smartphone, Store } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";

/**
 * The sidebar as an off-canvas drawer, below lg.
 *
 * WHY THIS NEEDS CLIENT STATE:
 * "is the drawer open" is a fact about this browser, this moment. It is
 * not in the URL, not in a database, and the server has no idea. Only a
 * component running in the browser can hold it - hence useState and
 * "use client".
 *
 * It renders the SAME AdminNavLinks as the desktop sidebar, so there is
 * one definition of the navigation and the two cannot drift.
 *
 * Reuses the shadcn Sheet already installed for the customer site's mobile
 * menu - which is exactly why that component was worth having.
 */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      {/* The Sheet handles the overlay, Escape, focus trapping and
          restoring focus to the trigger on close - all of which would be
          fiddly to get right by hand. */}
      <SheetContent
        side="left"
        className="w-[min(17rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0"
      >
        <SheetHeader className="h-16 shrink-0 flex-row items-center gap-2.5 space-y-0 border-b border-sidebar-border px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Smartphone className="size-5" aria-hidden="true" />
          </span>
          <SheetTitle className="font-heading text-sm font-bold text-white">
            SHABBIR MOBILES
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          {/* Closing on navigate: without it the drawer stays open over the
              page you just moved to. */}
          <AdminNavLinks onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Store className="size-3.5 shrink-0" aria-hidden="true" />
            View store
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
