"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Search, ChevronDown, User, Settings, LogOut, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { getAdminPageTitle } from "@/lib/admin-nav";
import { STAFF_DIRECTORY_ENABLED } from "@/lib/feature-flags";

/**
 * The admin topbar: menu button, page title, search, notifications,
 * profile.
 *
 * A Client Component because it shows the current page's name, which needs
 * the URL. It derives that from the SAME isAdminNavItemActive() the
 * sidebar uses, so the highlighted link and the title can never disagree.
 *
 * Everything here is UI-only. There is no auth, so the profile menu points
 * at real routes but signs nobody out.
 */
export function AdminTopbar() {
  const pathname = usePathname();
  const title = getAdminPageTitle(pathname);

  const router = useRouter();
  const { user, signOut } = useAuth();

  // Real now: read from the signed Firebase token, not a hard-coded
  // object. Falls back only while the initial auth state is loading -
  // the admin layout has already verified staff access server-side, so
  // anyone seeing this IS staff.
  const admin = {
    name: user?.displayName ?? user?.email ?? "Staff",
    role: user?.role ?? "",
    initials: (user?.displayName ?? user?.email ?? "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join(""),
  };

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
    }
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-5">
      <AdminMobileNav />

      {/* The page name, so you always know where you are - especially on
          mobile, where the sidebar is hidden. */}
      <h1 className="truncate font-heading text-base font-bold text-primary sm:text-lg">
        {title}
      </h1>

      {/* Search: full width from md, an icon button below that. */}
      <form
        role="search"
        className="ml-auto hidden max-w-xs flex-1 md:block lg:max-w-sm"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="admin-search" className="sr-only">
          Search products, orders and customers
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="admin-search"
            type="search"
            placeholder="Search products, orders..."
            className="h-9 w-full rounded-lg border border-border bg-muted/60 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:bg-background focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1 md:ml-2">
        <AdminNotifications />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-accent">
              {admin.initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">
                {admin.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {admin.role}
              </span>
            </span>
            <ChevronDown
              className="hidden size-4 text-muted-foreground sm:block"
              aria-hidden="true"
            />
            <span className="sr-only">Open admin menu</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <span className="block text-sm font-medium">{admin.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {admin.role || "Staff"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* "Profile" pointed at the staff directory, which 404s while
                that section is off. It was never a profile page anyway -
                the signed-in name and role are already shown just above,
                which is all it offered. */}
            {STAFF_DIRECTORY_ENABLED && (
              <DropdownMenuItem asChild>
                <Link href="/admin/users">
                  <User className="size-4" aria-hidden="true" />
                  Profile
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <Store className="size-4" aria-hidden="true" />
                Exit to store
              </Link>
            </DropdownMenuItem>
            {/* Signs out properly: clears the Firebase session AND the
                server cookie, and revokes refresh tokens so a copied
                cookie cannot keep working. */}
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
