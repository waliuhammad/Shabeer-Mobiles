import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoriesView } from "@/components/admin/categories/CategoriesView";

export const metadata: Metadata = { title: "Categories" };

/** /admin/categories */
export default function CategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Organise products into the groups customers browse."
      />
      <CategoriesView />
    </>
  );
}
