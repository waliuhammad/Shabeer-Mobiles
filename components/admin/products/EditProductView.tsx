"use client";

import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { useCatalog } from "@/context/CatalogContext";

interface EditProductViewProps {
  productId: string;
}

/**
 * /admin/products/[id]/edit
 *
 * Thin client wrapper: the server cannot resolve a product created in
 * this browser, so the lookup happens here.
 */
export function EditProductView({ productId }: EditProductViewProps) {
  const { getProduct, isHydrated } = useCatalog();
  const product = getProduct(productId);

  if (!product) {
    if (!isHydrated) return null;
    notFound();
  }


  // HYDRATION GATE - load-bearing, not a loading spinner.
  //
  // Before hydration the store holds only the seed, so a record that has
  // been edited in this browser still reads with its ORIGINAL values. The
  // form seeds its useState from what it is handed on first render, so
  // mounting it now would freeze those stale values into the form and
  // quietly discard the saved edit on the next save.
  //
  // Waiting one paint means the form always mounts with the real record.
  if (!isHydrated) return null;

  return (
    <>
      <AdminPageHeader title="Edit Product" description={product.name} />
      <ProductForm product={product} />
    </>
  );
}
