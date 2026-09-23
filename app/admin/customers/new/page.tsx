import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";

export const metadata: Metadata = { title: "Add Customer" };

/** /admin/customers/new - static segment, matched before [id]. */
export default function NewCustomerPage() {
  return (
    <>
      <AdminPageHeader
        title="Add Customer"
        description="Create a customer record that the shop counter and the website both share."
      />
      <CustomerForm />
    </>
  );
}
