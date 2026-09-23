import type { Metadata } from "next";
import { EditProductView } from "@/components/admin/products/EditProductView";

export const metadata: Metadata = { title: "Edit Product" };

/** /admin/products/[id]/edit */
export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  return <EditProductView productId={id} />;
}
