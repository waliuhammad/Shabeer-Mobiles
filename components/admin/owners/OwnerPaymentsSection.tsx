"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet, ArrowDownLeft, ArrowUpRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOwners } from "@/context/OwnersContext";
import {
  depositHeld,
  isCostKind,
  isDepositKind,
  isRecurringKind,
  OWNER_PAYMENT_LABELS,
  totalOfKind,
  validateOwnerPayment,
} from "@/lib/owner-utils";
import { toDateInputValue } from "@/lib/date-range";
import { now } from "@/lib/demo-clock";
import { formatOrderDateTime } from "@/lib/order-display";
import { formatPrice, cn } from "@/lib/utils";
import { OWNER_PAYMENT_KINDS } from "@/types";
import type { OwnerPaymentFormData, OwnerPaymentKind } from "@/types";

/**
 * What the shop has paid this person, and what they are still holding.
 *
 * THE TWO HALVES ARE NOT THE SAME KIND OF MONEY, which is the reason
 * this is not one running total. Advance and security are a deposit -
 * handed over, owed back, and not a cost. Rent and maintenance are
 * gone: the month was used and so was the money. Adding them together
 * would produce a number that answers no question anybody has.
 */
export function OwnerPaymentsSection({ ownerId }: { ownerId: string }) {
  const { getOwnerPayments, recordPayment } = useOwners();
  const payments = getOwnerPayments(ownerId);

  const summary = useMemo(
    () => ({
      held: depositHeld(payments),
      advance: totalOfKind(payments, "advance"),
      security: totalOfKind(payments, "security"),
      refunded: totalOfKind(payments, "refund"),
      rent: totalOfKind(payments, "rent"),
      maintenance: totalOfKind(payments, "maintenance"),
    }),
    [payments]
  );

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Money paid</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Advance and security are refundable. Rent and maintenance are costs
            and go to Profit &amp; Loss.
          </p>
        </div>
        <RecordPaymentDialog ownerId={ownerId} onRecord={recordPayment} />
      </div>

      <dl className="grid gap-px bg-border sm:grid-cols-3">
        <Stat
          Icon={Wallet}
          label="Deposit held"
          value={formatPrice(summary.held)}
          hint={`${formatPrice(summary.advance + summary.security)} paid, ${formatPrice(summary.refunded)} refunded`}
          tone={summary.held < 0 ? "bad" : "good"}
        />
        <Stat Icon={ArrowUpRight} label="Rent paid" value={formatPrice(summary.rent)} hint="Total to date" />
        <Stat
          Icon={ArrowUpRight}
          label="Maintenance paid"
          value={formatPrice(summary.maintenance)}
          hint="Total to date"
        />
      </dl>

      {payments.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">
          Nothing recorded yet. Use &ldquo;Record a payment&rdquo; for the advance,
          the security, and each month&apos;s rent and maintenance.
        </p>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Payments made to this person</caption>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium">Date</th>
                <th scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium">What</th>
                <th scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium">Covers</th>
                <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-right font-medium">Amount</th>
                <th role="presentation" className="w-full p-0" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <th scope="row" className="whitespace-nowrap px-5 py-2.5 text-left text-xs font-medium">
                    {formatOrderDateTime(p.paidOn).split(",")[0]}
                  </th>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        isDepositKind(p.kind)
                          ? "bg-cyan-soft text-secondary"
                          : p.kind === "refund"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {OWNER_PAYMENT_LABELS[p.kind]}
                    </span>
                    {p.expenseId && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        in P&amp;L
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-muted-foreground">
                    {p.periodMonth || "-"}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums",
                      p.kind === "refund" ? "text-success" : "text-foreground"
                    )}
                  >
                    {p.kind === "refund" ? "- " : ""}
                    {formatPrice(p.amount)}
                  </td>
                  <td role="presentation" className="p-0" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  hint,
  tone = "plain",
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "good" | "bad";
}) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-heading text-lg font-bold tabular-nums",
          tone === "bad" ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </dd>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

const EMPTY: OwnerPaymentFormData = {
  kind: "rent",
  amount: "",
  paidOn: "",
  periodMonth: "",
  notes: "",
};

function RecordPaymentDialog({
  ownerId,
  onRecord,
}: {
  ownerId: string;
  onRecord: (ownerId: string, data: OwnerPaymentFormData) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<OwnerPaymentFormData>(() => ({
    ...EMPTY,
    paidOn: toDateInputValue(now()),
  }));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = validateOwnerPayment(data);
  const ok = Object.keys(errors).length === 0;

  const set = <K extends keyof OwnerPaymentFormData>(k: K, v: OwnerPaymentFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  async function submit() {
    setTouched(true);
    if (!ok) return;
    setSaving(true);
    try {
      await onRecord(ownerId, data);
      toast.success("Recorded.", {
        description: isCostKind(data.kind)
          ? "Added to Profit & Loss as an expense too."
          : "Counted against the deposit, not as a cost.",
      });
      setData({ ...EMPTY, paidOn: toDateInputValue(now()) });
      setTouched(false);
      setOpen(false);
    } catch {
      toast.error("Could not save.", {
        description: "The write was refused. Check you are signed in as an owner or manager.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="h-9 gap-1.5 text-xs">
          <Plus className="size-3.5" aria-hidden="true" />
          Record a payment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Money handed to the plaza owner. Back-date it to enter history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="op-kind" className="mb-1 block text-xs font-medium text-foreground">
              What is it?
            </label>
            <Select value={data.kind} onValueChange={(v) => set("kind", v as OwnerPaymentKind)}>
              <SelectTrigger id="op-kind" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNER_PAYMENT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {OWNER_PAYMENT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="op-amount" className="mb-1 block text-xs font-medium text-foreground">
                Amount (Rs)
              </label>
              <input
                id="op-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={data.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none focus:border-secondary"
              />
            </div>
            <div>
              <label htmlFor="op-date" className="mb-1 block text-xs font-medium text-foreground">
                Date paid
              </label>
              <input
                id="op-date"
                type="date"
                value={data.paidOn}
                max={toDateInputValue(now())}
                onChange={(e) => set("paidOn", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/*
            Only rent and maintenance cover a month. An advance covers
            no period at all, and asking for one would invite a
            meaningless answer that then dates the expense.
          */}
          {isRecurringKind(data.kind) && (
            <div>
              <label htmlFor="op-month" className="mb-1 block text-xs font-medium text-foreground">
                Month it covers
              </label>
              <input
                id="op-month"
                type="month"
                value={data.periodMonth}
                onChange={(e) => set("periodMonth", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none focus:border-secondary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                April&apos;s rent paid in May is an April cost. This is what dates
                it in Profit &amp; Loss, not the date above.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="op-notes" className="mb-1 block text-xs font-medium text-foreground">
              Notes (optional)
            </label>
            <input
              id="op-notes"
              type="text"
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Receipt number, who it was handed to..."
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-secondary"
            />
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
            {isCostKind(data.kind) ? (
              <>
                This also creates an <strong className="font-semibold text-foreground">Expense</strong>,
                so it reaches Profit &amp; Loss. Do not enter it under Expenses as
                well - it would be counted twice.
              </>
            ) : data.kind === "refund" ? (
              <>
                A refund reduces what the landlord is holding. It is not income
                and does not touch Profit &amp; Loss.
              </>
            ) : (
              <>
                A deposit is money the landlord holds and owes back, so it is
                <strong className="font-semibold text-foreground"> not</strong> a
                cost and stays out of Profit &amp; Loss.
              </>
            )}
          </p>

          {touched && !ok && (
            <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {Object.values(errors).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
