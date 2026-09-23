import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SupplierForm } from "@/components/admin/suppliers/SupplierForm";

export const metadata: Metadata = { title: "Add Supplier" };

/**
 * /admin/suppliers/new
 *
 * NOTE ON ROUTING: this static segment sits beside the dynamic [id].
 * Next.js matches static before dynamic, so /new never reaches [id].
 */
export default function NewSupplierPage() {
  return (
    <>
      <AdminPageHeader
        title="Add Supplier"
        description="Record a new business you buy stock from."
      />
      <SupplierForm />
    </>
  );
}
