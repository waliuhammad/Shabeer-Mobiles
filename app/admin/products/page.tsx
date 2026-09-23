import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductsView } from "@/components/admin/products/ProductsView";

export const metadata: Metadata = { title: "Products" };

/** /admin/products */
export default function ProductsPage() {
  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage your mobile phones and accessories."
      />
      <ProductsView />
    </>
  );
}
