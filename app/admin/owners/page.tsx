import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OwnersView } from "@/components/admin/owners/OwnersView";

export const metadata: Metadata = { title: "Owners" };

/** /admin/owners */
export default function OwnersPage() {
  return (
    <>
      <AdminPageHeader
        title="Owners & Stakeholders"
        description="The people with a stake in the shop and in the plaza."
      />
      <OwnersView />
    </>
  );
}
