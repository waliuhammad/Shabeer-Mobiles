import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OwnerDetailView } from "@/components/admin/owners/OwnerDetailView";

export const metadata: Metadata = { title: "Owner" };

/**
 * /admin/owners/[id]
 *
 * No data is read here. The view takes it from OwnersContext, which the
 * admin layout already subscribes to, so opening a record costs no
 * extra Firestore read and a change made on another machine arrives
 * without a refresh.
 */
export default async function OwnerPage({
  params,
}: PageProps<"/admin/owners/[id]">) {
  const { id } = await params;
  return (
    <>
      <AdminPageHeader title="Owner" description="Contact details and stake." />
      <OwnerDetailView ownerId={id} />
    </>
  );
}
