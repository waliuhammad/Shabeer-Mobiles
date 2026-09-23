import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NewPurchaseView } from "@/components/admin/purchases/NewPurchaseView";

export const metadata: Metadata = { title: "New Purchase" };

/** /admin/purchases/new - static segment, matched before [id]. */
export default function NewPurchasePage() {
  return (
    <>
      <AdminPageHeader
        title="New Purchase"
        description="Record stock bought in from a supplier. Saves as a draft."
      />
      <NewPurchaseView />
    </>
  );
}
