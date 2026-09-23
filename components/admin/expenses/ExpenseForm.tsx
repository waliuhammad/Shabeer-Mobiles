"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Save, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { useExpenses } from "@/context/ExpensesContext";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_CONFIG,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_CONFIG,
  validateExpense,
  type ExpenseErrors,
} from "@/lib/expense-utils";
import { now } from "@/lib/demo-clock";
import { toDateInputValue } from "@/lib/date-range";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFormData,
  ExpensePaymentMethod,
  ExpenseStatus,
} from "@/types";

interface ExpenseFormProps {
  /** Present = edit mode, absent = create mode. */
  expense?: Expense;
}

/**
 * ONE form, two modes - the same arrangement as CustomerForm and
 * SupplierForm. Create and edit differ only in what they start with and
 * where they go afterwards; two separate forms would drift the first
 * time a field was added to one of them.
 */
export function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter();
  const { createExpense, updateExpense } = useExpenses();
  const isEdit = Boolean(expense);

  const [data, setData] = useState<ExpenseFormData>(() =>
    expense
      ? {
          title: expense.title,
          category: expense.category,
          amount: String(expense.amount),
          paymentMethod: expense.paymentMethod,
          description: expense.description,
          status: expense.status,
          expenseDate: toDateInputValue(new Date(expense.expenseDate)),
        }
      : {
          title: "",
          category: "OTHER",
          amount: "",
          paymentMethod: "CASH",
          description: "",
          status: "PAID",
          // Defaults to today, which is what most entries are.
          expenseDate: toDateInputValue(now()),
        }
  );
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const set = (field: keyof ExpenseFormData, value: string) => {
    const next = { ...data, [field]: value } as ExpenseFormData;
    setData(next);
    if (touched.has(field)) setErrors(onlyTouched(validateExpense(next), touched));
  };

  const blur = (field: keyof ExpenseFormData) => {
    const nextTouched = new Set(touched).add(field);
    setTouched(nextTouched);
    setErrors(onlyTouched(validateExpense(data), nextTouched));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validateExpense(data);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(["title", "amount", "expenseDate"]));
      setErrors(found);
      return;
    }

    if (isEdit && expense) {
      const updated = updateExpense(expense.id, data);
      if (!updated) {
        // The only way this returns undefined is a cancelled expense,
        // which the route guards against - but the form must not claim
        // success for a write that did not happen.
        toast.error("This expense is cancelled and can no longer be edited.");
        return;
      }
      toast.success("Expense updated.", { description: updated.title });
      router.push(`/admin/expenses/${expense.id}`);
      return;
    }

    const created = createExpense(data);
    toast.success("Expense recorded.", { description: created.title });
    router.push(`/admin/expenses/${created.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Expense Title"
            value={data.title}
            onChange={(v) => set("title", v)}
            onBlur={() => blur("title")}
            error={errors.title}
            placeholder="Shop Rent - September"
            required
            className="sm:col-span-2"
          />

          <div>
            <label
              htmlFor="expense-category"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Category <span className="text-destructive">*</span>
            </label>
            <Select
              value={data.category}
              onValueChange={(v) => set("category", v as ExpenseCategory)}
            >
              <SelectTrigger id="expense-category" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_CATEGORY_CONFIG[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Drives the breakdown on the Profit &amp; Loss page.
            </p>
          </div>

          <FormField
            label="Amount (Rs)"
            type="number"
            value={data.amount}
            onChange={(v) => set("amount", v)}
            onBlur={() => blur("amount")}
            error={errors.amount}
            placeholder="45000"
            required
          />

          <div>
            <label
              htmlFor="expense-payment"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Payment Method <span className="text-destructive">*</span>
            </label>
            <Select
              value={data.paymentMethod}
              onValueChange={(v) => set("paymentMethod", v as ExpensePaymentMethod)}
            >
              <SelectTrigger id="expense-payment" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {EXPENSE_PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormField
            label="Expense Date"
            type="date"
            value={data.expenseDate}
            onChange={(v) => set("expenseDate", v)}
            onBlur={() => blur("expenseDate")}
            error={errors.expenseDate}
            required
          />

          <div className="sm:col-span-2">
            <label
              htmlFor="expense-status"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Status
            </label>
            <Select
              value={data.status}
              onValueChange={(v) => set("status", v as ExpenseStatus)}
            >
              <SelectTrigger id="expense-status" className="h-10 w-full sm:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_STATUSES.filter(
                  // Cancelling is a deliberate action with its own
                  // confirmation, not a dropdown choice made in passing.
                  (s) => s !== "CANCELLED"
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {EXPENSE_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {EXPENSE_STATUS_CONFIG[data.status].note}
            </p>
          </div>

          <FormField
            label="Description"
            value={data.description}
            onChange={(v) => set("description", v)}
            placeholder="What this covers, bill reference, anything worth remembering"
            textarea
            rows={3}
            className="sm:col-span-2"
          />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Stock bought from a supplier does not belong here - record it under
          Purchases. Buying stock swaps cash for inventory of the same value, and
          that cost reaches the accounts as cost of goods sold when the item is
          actually sold. Only costs that are consumed, like rent and electricity,
          are operating expenses.
        </p>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
          <Link href={expense ? `/admin/expenses/${expense.id}` : "/admin/expenses"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button
          type="submit"
          className="h-10 gap-1.5 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? "Save Changes" : "Save Expense"}
        </Button>
      </div>
    </form>
  );
}

function onlyTouched(all: ExpenseErrors, touched: Set<string>): ExpenseErrors {
  const out: ExpenseErrors = {};
  for (const key of Object.keys(all) as (keyof ExpenseErrors)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
