import type { Metadata } from "next";
import { EditOwnerView } from "@/components/admin/owners/EditOwnerView";

export const metadata: Metadata = { title: "Edit Owner" };

/** /admin/owners/[id]/edit */
export default async function EditOwnerPage({
  params,
}: PageProps<"/admin/owners/[id]/edit">) {
  const { id } = await params;
  return <EditOwnerView ownerId={id} />;
}
