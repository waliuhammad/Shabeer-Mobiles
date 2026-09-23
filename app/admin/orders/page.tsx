import type { Metadata } from "next";
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
