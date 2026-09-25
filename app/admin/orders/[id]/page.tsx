import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { OrderDetailView } from "@/components/admin/orders/OrderDetailView";
import { getDemoOrder } from "@/data/orders";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

/**
 * /admin/orders/[id]
 *
 * NOTE ON THE PARAM: `id` here is the ORDER NUMBER ("SM-1001"), because
 * in this mock phase there is no database issuing separate document ids.
 * Once Firestore does, the route becomes /admin/orders/{documentId} and
 * the order number stays the human-facing reference printed on receipts.
 * The two are different things - see types/order.ts.
 *
 * Read on the SERVER from the shared dataset; live admin changes are
 * layered on by OrdersContext inside the view.
 */
export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  // See the list page: the route stays reachable by URL otherwise, and
  // what it renders comes from data/orders.ts, not Firestore.
  if (!ONLINE_ORDERING_ENABLED) notFound();

  const { id } = await params;
  const order = getDemoOrder(id);

  // A real 404, and it narrows `order` to Order for the view below.
  if (!order) notFound();

  return <OrderDetailView fallbackOrder={order} />;
}
