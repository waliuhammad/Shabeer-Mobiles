import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STAFF_DIRECTORY_ENABLED } from "@/lib/feature-flags";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersView } from "@/components/admin/users/UsersView";

export const metadata: Metadata = { title: "Users / Staff" };

/**
 * /admin/users
 *
 * DISABLED while STAFF_DIRECTORY_ENABLED is false. The guard is here as
 * well as in the sidebar because removing a link is not removing a page:
 * the URL is still typeable, and anyone who bookmarked it would
 * otherwise walk straight back in.
 *
 * Kept whole and still type-checked, like the rest of the switched-off
 * code. Flip the flag in lib/feature-flags.ts to bring it back.
 */
export default function UsersPage() {
  if (!STAFF_DIRECTORY_ENABLED) notFound();

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
