"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/Logo";
import { SearchBar } from "@/components/shared/SearchBar";
import { STORE_NAV, BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Shown only in the drawer - the desktop header uses icons for these. */
const ACCOUNT_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "Track Order", href: "/tracking" },
  { label: "My Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
  { label: "Login / Register", href: "/login" },
];

/**
 * The mobile navigation drawer.
 *
 * It maps over the SAME STORE_NAV array the desktop nav uses, so the two
 * can never show different links.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-[85vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <Logo />
        </SheetHeader>

        <div className="p-4">
          <SearchBar onSubmitted={() => setOpen(false)} />
        </div>

        <nav className="flex flex-col px-2" aria-label="Mobile navigation">
          {STORE_NAV.map((link) => {
            const isActive = pathname === link.href;
            return (
              <SheetClose asChild key={link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        {/* Account links - not in STORE_NAV because the desktop header shows
            these as icons instead. The drawer has room for words. */}
        <nav className="mt-2 flex flex-col border-t border-border px-2 pt-2" aria-label="Account">
          {ACCOUNT_LINKS.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border p-4 text-sm">
          <a
            href={`tel:${BUSINESS.phone}`}
            className="flex items-center gap-2.5 text-foreground hover:text-secondary"
          >
            <Phone className="size-4 text-secondary" aria-hidden="true" />
            {BUSINESS.phoneDisplay}
          </a>
          <p className="flex items-start gap-2.5 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
            {FULL_ADDRESS}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
