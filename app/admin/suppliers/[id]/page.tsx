import type { Metadata } from "next";
import { SupplierDetailView } from "@/components/admin/suppliers/SupplierDetailView";

export const metadata: Metadata = { title: "Supplier" };

/**
 * /admin/suppliers/[id]
 *
 * The id is resolved CLIENT-side, because a supplier created in this
 * browser does not exist in the server's seed data. Once Firestore holds
 * suppliers, this becomes a server read like the order detail page.
 */
export default async function SupplierDetailPage({
  params,
}: PageProps<"/admin/suppliers/[id]">) {
  const { id } = await params;
  return <SupplierDetailView supplierId={id} />;
}
