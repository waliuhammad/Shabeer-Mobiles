import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomersView } from "@/components/admin/customers/CustomersView";

export const metadata: Metadata = { title: "Customers" };

/** /admin/customers - Server Component shell, client island inside. */
export default function CustomersPage() {
  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Manage customer profiles, contact information and purchase history."
      />
      <CustomersView />
    </>
  );
}
