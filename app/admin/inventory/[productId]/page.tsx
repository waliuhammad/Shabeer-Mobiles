import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductInventoryView } from "@/components/admin/inventory/ProductInventoryView";
import { getProductById } from "@/services/catalog.service";

export async function generateMetadata({
  params,
}: PageProps<"/admin/inventory/[productId]">): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);
  return { title: product ? `${product.name} - Inventory` : "Inventory" };
}

/**
 * /admin/inventory/[productId]
 *
 * The product is read on the SERVER from Firestore - the same records the
 * storefront and the POS use. Live stock and the ledger are read on the
 * client, where the real-time subscription keeps them current.
 */
export default async function ProductInventoryPage({
  params,
}: PageProps<"/admin/inventory/[productId]">) {
  const { productId } = await params;
  const product = await getProductById(productId);

  // A real 404 rather than an empty page, and it narrows `product` from
  // Product | undefined to Product for everything below.
  if (!product) notFound();

  return <ProductInventoryView product={product} />;
}
