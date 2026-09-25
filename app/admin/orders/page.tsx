import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrdersView } from "@/components/admin/orders/OrdersView";

export const metadata: Metadata = { title: "Online Orders" };

/**
 * /admin/orders
 *
 * A Server Component shell around one client island. Admin status
 * changes live in browser state, so the working parts are client-side.
 */
export default function AdminOrdersPage() {
  /**
   * DISABLED while the shop does not take online orders.
   *
   * The guard is here as well as in the sidebar because removing a link
   * is not removing a page - the URL is still typeable, and this one led
   * to a detail view that reads demo fixtures.
   */
  if (!ONLINE_ORDERING_ENABLED) notFound();

  return (
    <>
      <AdminPageHeader
        title="Online Orders"
        description="Confirm, pack and dispatch orders placed on the website."
      />
      <OrdersView />
    </>
  );
}
