import type { Metadata } from "next";
import { EditSupplierView } from "@/components/admin/suppliers/EditSupplierView";

export const metadata: Metadata = { title: "Edit Supplier" };

/** /admin/suppliers/[id]/edit - reuses the SAME SupplierForm. */
export default async function EditSupplierPage({
  params,
}: PageProps<"/admin/suppliers/[id]/edit">) {
  const { id } = await params;
  return <EditSupplierView supplierId={id} />;
}
