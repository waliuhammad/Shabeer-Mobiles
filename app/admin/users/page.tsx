import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersView } from "@/components/admin/users/UsersView";

export const metadata: Metadata = { title: "Users / Staff" };

/** /admin/users */
export default function UsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Users / Staff"
        description="Who works here, and what each person should be allowed to do."
      />
      <UsersView />
    </>
  );
}
