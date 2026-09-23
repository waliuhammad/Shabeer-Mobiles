import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpensesView } from "@/components/admin/expenses/ExpensesView";

export const metadata: Metadata = { title: "Expenses" };

/** /admin/expenses - Server Component shell, client island inside. */
export default function ExpensesPage() {
  return (
    <>
      <AdminPageHeader
        title="Expenses"
        description="Track and manage business operating expenses."
      />
      <ExpensesView />
    </>
  );
}
