import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "New Product" };

/** /admin/products/new */
export default function NewProductPage() {
  return (
    <>
      <AdminPageHeader
        title="Add Product"
        description="Create a product. It starts as a draft until you give it stock and set it active."
      />
      <ProductForm />
    </>
  );
}
