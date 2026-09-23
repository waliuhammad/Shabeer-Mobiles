import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PurchasesView } from "@/components/admin/purchases/PurchasesView";

export const metadata: Metadata = { title: "Purchases" };

/** /admin/purchases */
export default function PurchasesPage() {
  return (
    <>
      <AdminPageHeader
        title="Purchases"
        description="Manage stock purchases, supplier invoices, and purchase payments."
      />
      <PurchasesView />
    </>
  );
}
