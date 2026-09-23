import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SuppliersView } from "@/components/admin/suppliers/SuppliersView";

export const metadata: Metadata = { title: "Suppliers" };

/** /admin/suppliers - Server Component shell, client island inside. */
export default function SuppliersPage() {
  return (
    <>
      <AdminPageHeader
        title="Suppliers"
        description="The people and shops you buy stock from."
      />
      <SuppliersView />
    </>
  );
}
