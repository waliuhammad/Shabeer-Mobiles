import type { Metadata } from "next";
import { EditCustomerView } from "@/components/admin/customers/EditCustomerView";

export const metadata: Metadata = { title: "Edit Customer" };

/** /admin/customers/[id]/edit - reuses the SAME CustomerForm. */
export default async function EditCustomerPage({
  params,
}: PageProps<"/admin/customers/[id]/edit">) {
  const { id } = await params;
  return <EditCustomerView customerId={id} />;
}
