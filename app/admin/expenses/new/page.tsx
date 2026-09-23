import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpenseForm } from "@/components/admin/expenses/ExpenseForm";

export const metadata: Metadata = { title: "New Expense" };

/** /admin/expenses/new */
export default function NewExpensePage() {
  return (
    <>
      <AdminPageHeader
        title="Add Expense"
        description="Record a running cost such as rent, a utility bill or wages."
      />
      <ExpenseForm />
    </>
  );
}
