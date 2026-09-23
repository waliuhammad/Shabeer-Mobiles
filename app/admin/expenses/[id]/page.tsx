import type { Metadata } from "next";
import { ExpenseDetailView } from "@/components/admin/expenses/ExpenseDetailView";

export const metadata: Metadata = { title: "Expense" };

/**
 * /admin/expenses/[id]
 *
 * Resolved client-side: an expense recorded in this browser is unknown
 * to the server seed, so the server cannot decide whether the id exists.
 */
export default async function ExpenseDetailPage({
  params,
}: PageProps<"/admin/expenses/[id]">) {
  const { id } = await params;
  return <ExpenseDetailView expenseId={id} />;
}
