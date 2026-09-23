import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductInventoryView } from "@/components/admin/inventory/ProductInventoryView";
import { getProductById } from "@/data/products";

export async function generateMetadata({
  params,
}: PageProps<"/admin/inventory/[productId]">): Promise<Metadata> {
  const { productId } = await params;
  const product = getProductById(productId);
  return { title: product ? `${product.name} - Inventory` : "Inventory" };
}

/**
 * /admin/inventory/[productId]
 *
 * The product is read on the SERVER from the one catalogue - the same
 * records the storefront and POS use. Live stock and the ledger are read
 * on the client, because locally recorded movements exist only there.
 */
export default async function ProductInventoryPage({
  params,
}: PageProps<"/admin/inventory/[productId]">) {
  const { productId } = await params;
  const product = getProductById(productId);

  // A real 404 rather than an empty page, and it narrows `product` from
  // Product | undefined to Product for everything below.
  if (!product) notFound();

  return <ProductInventoryView product={product} />;
}
