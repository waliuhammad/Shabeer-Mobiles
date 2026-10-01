import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OwnerForm } from "@/components/admin/owners/OwnerForm";

export const metadata: Metadata = { title: "Add Owner" };

/** /admin/owners/new */
export default function NewOwnerPage() {
  return (
    <>
      <AdminPageHeader
        title="Add a person"
        description="An owner, a partner, or somebody who owns the plaza."
      />
      <OwnerForm />
    </>
  );
}
