"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExpenses } from "@/context/ExpensesContext";
import { useOwners } from "@/context/OwnersContext";
import { formatPrice } from "@/lib/utils";
import type { Expense } from "@/types";

interface DeleteExpenseDialogProps {
  /** The expense to delete; null keeps the dialog closed. */
  expense: Expense | null;
  onClose: () => void;
  /** Runs after the delete has been written - e.g. leave the detail page. */
  onDeleted?: () => void;
}

/**
 * PERMANENT DELETE, shared by the list and the detail page.
 *
 * Every figure - operating expenses, net profit, the P&L breakdown - is
 * computed live from the expense list, so removing the row is all it
 * takes for those numbers to move. Nothing else needs recalculating.
 *
 * The one thing that does NOT follow is an Owners-page payment: rent
 * and maintenance create their expense automatically, and deleting the
 * expense leaves the payment itself recorded. The dialog says so rather
 * than letting the two silently disagree.
 */
export function DeleteExpenseDialog({ expense, onClose, onDeleted }: DeleteExpenseDialogProps) {
  const { deleteExpense } = useExpenses();
  const { payments } = useOwners();

  const fromOwnerPayment =
    expense !== null && payments.some((p) => p.expenseId === expense.id);
  const counted = expense !== null && expense.status !== "CANCELLED";

  async function handleDelete() {
    if (!expense) return;
    try {
      await deleteExpense(expense.id);
      toast.success("Expense deleted.", { description: expense.title });
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error("Could not delete.", {
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  return (
    <AlertDialog open={expense !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>
            {expense?.title} ({formatPrice(expense?.amount ?? 0)}) will be removed
            permanently and cannot be brought back.
            {counted &&
              " Operating expenses for its month go down by that amount, and net profit goes up by the same."}
            {fromOwnerPayment &&
              " It was created by a payment on the Owners page - that payment stays recorded there."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete expense
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
