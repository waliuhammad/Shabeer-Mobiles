import type { Metadata } from "next";
import { CustomerDetailView } from "@/components/admin/customers/CustomerDetailView";

export const metadata: Metadata = { title: "Customer" };

/**
 * /admin/customers/[id]
 *
 * The param is the CUSTOMER id (cus_001) - deliberately unlike an order
 * number (SM-1001) or an invoice number (SM-INV-0001). Resolved
 * client-side because customers created in this browser (including from
 * the POS) are unknown to the server seed.
 */
export default async function CustomerDetailPage({
  params,
}: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetailView customerId={id} />;
}
