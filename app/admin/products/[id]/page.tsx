import type { Metadata } from "next";
import { ProductDetailView } from "@/components/admin/products/ProductDetailView";

export const metadata: Metadata = { title: "Product" };

/** /admin/products/[id] - the PRODUCT id (p-001), not the slug. */
export default async function AdminProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <ProductDetailView productId={id} />;
}
