"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
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
import { formatPrice } from "@/lib/utils";
import type { CustomLineInput } from "@/hooks/use-pos";

interface POSCustomItemDialogProps {
  onAdd: (input: CustomLineInput) => void;
}

const EMPTY = { name: "", price: "", purchasePrice: "", quantity: "1" };

/**
 * Put something on the bill that the shop does not stock.
 *
 * THE CASE THIS EXISTS FOR: a customer wants a part the shop does not
 * carry, someone walks to another shop in the plaza, buys it, and sells
 * it on at the counter. Until now that sale could not be rung up at all,
 * so it either went unrecorded - invisible to revenue, profit and the
 * customer's history - or a real product got billed in its place, which
 * is worse: it deducts stock that never moved.
 *
 * WHY IT ASKS WHAT THE SHOP PAID. Every other line on a bill gets its
 * cost looked up server-side, in a collection the cashier is not allowed
 * to read. An off-catalogue item has no such record, and a line that
 * reached the books without one would report its entire sale price as
 * profit. So the cost is required, and the field says plainly that the
 * customer never sees it.
 *
 * WHY IT IS A DIALOG rather than fields sitting on the till. Four inputs
 * permanently on screen, used a few times a month, in the busiest part
 * of the panel - the product search is what the counter reaches for a
 * hundred times a day, and it should not have to share the space.
 */
export function POSCustomItemDialog({ onAdd }: POSCustomItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);

  const name = form.name.trim();
  const price = Number(form.price);
  const cost = Number(form.purchasePrice);
  const quantity = Number(form.quantity);

  const problems: string[] = [];
  if (!name) problems.push("Give the item a name, so the receipt reads sensibly.");
  if (!form.price.trim() || !Number.isFinite(price) || price < 0)
    problems.push("Enter the price the customer is paying.");
  if (!form.purchasePrice.trim() || !Number.isFinite(cost) || cost < 0)
    problems.push("Enter what the shop paid for it.");
  if (!Number.isFinite(quantity) || quantity < 1)
    problems.push("Quantity must be at least 1.");

  const ok = problems.length === 0;
  /**
   * Shown, not blocked. Selling something on at a loss is a real thing a
   * shop does - to keep a customer, or to shift a favour - and a till
   * that refused it would just get worked around. It is worth saying out
   * loud before the bill is rung up, though.
   */
  const sellingAtALoss = ok && price < cost;

  function reset() {
    setForm(EMPTY);
    setTouched(false);
  }

  function submit() {
    setTouched(true);
    if (!ok) return;
    onAdd({ name, price, purchasePrice: cost, quantity });
    reset();
    setOpen(false);
  }

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full gap-1.5 text-sm">
          <PackagePlus className="size-4" aria-hidden="true" />
          Add an item the shop does not stock
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Off-catalogue item</DialogTitle>
          <DialogDescription>
            Something bought in from another shop for this customer. It is not
            in the catalogue, so nothing here comes off the shelf count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="ci-name" className="mb-1 block text-xs font-medium text-foreground">
              What is it?
            </label>
            <input
              id="ci-name"
              type="text"
              autoComplete="off"
              placeholder="e.g. Oppo A16 back glass"
              maxLength={120}
              {...field("name")}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              This is what prints on the customer&apos;s receipt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ci-price"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Price to customer (Rs)
              </label>
              <input
                id="ci-price"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...field("price")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label
                htmlFor="ci-cost"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                What the shop paid (Rs)
              </label>
              <input
                id="ci-cost"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...field("purchasePrice")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Never shown to the customer.
              </p>
            </div>
          </div>

          <div className="w-28">
            <label
              htmlFor="ci-qty"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Quantity
            </label>
            <input
              id="ci-qty"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              {...field("quantity")}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {ok && (
            <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              Line total{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatPrice(price * quantity)}
              </span>
              , profit{" "}
              <span
                className={
                  sellingAtALoss
                    ? "font-semibold tabular-nums text-destructive"
                    : "font-semibold tabular-nums text-foreground"
                }
              >
                {formatPrice((price - cost) * quantity)}
              </span>
              {sellingAtALoss && " - this sells below what it cost."}
            </p>
          )}

          {touched && problems.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Add to bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
