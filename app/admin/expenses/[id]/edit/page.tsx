import type { Metadata } from "next";
import { EditExpenseView } from "@/components/admin/expenses/EditExpenseView";

export const metadata: Metadata = { title: "Edit Expense" };

/** /admin/expenses/[id]/edit */
export default async function EditExpensePage({
  params,
}: PageProps<"/admin/expenses/[id]/edit">) {
  const { id } = await params;
  return <EditExpenseView expenseId={id} />;
}
