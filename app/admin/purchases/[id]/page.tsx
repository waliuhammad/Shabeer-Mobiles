import type { Metadata } from "next";
import { PurchaseDetailView } from "@/components/admin/purchases/PurchaseDetailView";

export const metadata: Metadata = { title: "Purchase" };

/**
 * /admin/purchases/[id]
 *
 * The id is the INTERNAL purchase id (purchase_abc123), not the
 * human-facing PUR-0001 - the same separation Order draws between id and
 * orderNumber. Resolved client-side because purchases created in this
 * browser are unknown to the server seed.
 */
export default async function PurchaseDetailPage({
  params,
}: PageProps<"/admin/purchases/[id]">) {
  const { id } = await params;
  return <PurchaseDetailView purchaseId={id} />;
}
