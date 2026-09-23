import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/dal";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { SettingsProvider } from "@/context/SettingsContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { PurchasingProvider } from "@/context/PurchasingContext";
import { CustomersProvider } from "@/context/CustomersContext";
import { InvoicesProvider } from "@/context/InvoicesContext";
import { ExpensesProvider } from "@/context/ExpensesContext";

export const metadata: Metadata = {
  title: {
    default: "Admin Panel",
    template: "%s | Shabbir Mobiles Admin",
  },
  // The admin panel must never be indexed, and crawlers should not follow
  // links out of it either.
  robots: { index: false, follow: false },
};

/**
 * The admin shell: Sidebar + Topbar + Main.
 *
 * WHY A SEPARATE LAYOUT FROM THE CUSTOMER SITE
 * --------------------------------------------
 *   app/layout.tsx              html, fonts, globals.css, providers
 *        |                      (EVERY route - one theme, one font stack)
 *        |
 *        +-- app/(store)/layout.tsx   Header + Footer   (customer only)
 *        |
 *        +-- app/admin/layout.tsx     Sidebar + Topbar  (admin only)
 *
 * This is what nested layouts buy us. Both shells inherit the same tokens,
 * typography and components from the root - so the two halves feel like
 * one product - while the chrome is completely different, because a shop
 * operator's needs are nothing like a shopper's.
 *
 * The customer's Header, Footer, cart badge and wishlist badge are simply
 * not in this tree, so none of that code loads on an admin page. In the
 * Pages Router this would have been `if (router.pathname.startsWith(...))`
 * conditionals in one global _app.tsx - fragile, and it leaks each side's
 * code into the other's bundle.
 *
 * NOTE: `/admin` sits OUTSIDE the (store) route group, so it does not
 * inherit StoreHeader or StoreFooter. It does still sit inside the root
 * layout's CartProvider - harmless today, and useful in Phase 1C Step 2
 * when the POS screen needs a cart of its own.
 *
 * SECURITY, not yet implemented:
 *   Firebase Auth -> custom claim `role` -> guard here -> /admin
 * A guard in this layout covers every admin page at once, which is exactly
 * why the shell is the right place for it. But a UI guard only hides
 * screens; Firestore Security Rules must independently reject an
 * unauthorised read, because anyone can call the database directly.
 */
/**
 * THE admin authorization boundary.
 *
 * requireStaff() verifies the session cookie's signature with the Firebase
 * Admin SDK on the server, checks the revocation list, and reads the
 * `staff` custom claim. A visitor who is not staff never receives a byte
 * of admin markup - the redirect happens before this layout renders.
 *
 * This is the real check. proxy.ts only noticed whether a cookie was
 * present; it could not tell a genuine one from a string someone typed
 * into devtools. This can.
 *
 * Because it is async and awaits a verification, every admin route is
 * dynamic. That is the correct trade: an admin panel must never be
 * served from a cache that predates knowing who is asking.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireStaff();

  return (
    /* InventoryProvider wraps the admin area only. The storefront never
       reads the ledger, so its code never reaches the customer bundle. */
    <SettingsProvider>
      <CatalogProvider>
      <InventoryProvider>
      <OrdersProvider>
        <PurchasingProvider>
          <CustomersProvider>
            <InvoicesProvider>
              <ExpensesProvider>
            <div className="flex min-h-dvh bg-muted/40">
        {/* Fixed sidebar, desktop only. The mobile equivalent is the
            drawer inside AdminTopbar. */}
        <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
          <AdminSidebar />
        </div>

        {/* min-w-0 matters: without it a wide table or chart inside this
            column forces the whole page to scroll sideways. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
            </div>
              </ExpensesProvider>
            </InvoicesProvider>
          </CustomersProvider>
        </PurchasingProvider>
      </OrdersProvider>
      </InventoryProvider>
      </CatalogProvider>
    </SettingsProvider>
  );
}
