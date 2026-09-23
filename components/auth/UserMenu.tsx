"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, LogOut, LayoutDashboard, Package, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

/**
 * The storefront account control.
 *
 * Signed out, it is a link to /login - exactly what it was before. Signed
 * in, it becomes a menu with the customer's name, their orders, and the
 * only sign-out button on the storefront.
 *
 * WHY router.refresh() AFTER SIGNING OUT
 * --------------------------------------
 * Signing out clears the Firebase session in the browser AND the httpOnly
 * cookie on the server. Server components were rendered knowing who you
 * were, and React keeps that rendered output until something invalidates
 * it. Without refresh(), /account would still show the previous person's
 * name until a hard reload - which looks exactly like a security bug even
 * though the data is already unreachable.
 */
export function UserMenu() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      toast.success("Signed out.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // While Firebase reports the initial state, render the signed-out link.
  // Guessing "signed in" and then correcting would flash the wrong name.
  if (loading || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-muted"
        aria-label="Login to your account"
      >
        <User className="size-5" aria-hidden="true" />
      </Link>
    );
  }

  const label = user.displayName ?? user.email ?? user.phone ?? "My Account";
  const initials = (user.displayName ?? user.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-muted"
        aria-label="Open account menu"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-accent">
          {initials || "?"}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {user.isStaff ? `Staff · ${user.role}` : "Customer"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="size-4" aria-hidden="true" />
            My Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/tracking">
            <Package className="size-4" aria-hidden="true" />
            Track an Order
          </Link>
        </DropdownMenuItem>

        {/* Shown only to staff. This is convenience, not security - the
            admin layout verifies the claim server-side regardless. */}
        {user.isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
