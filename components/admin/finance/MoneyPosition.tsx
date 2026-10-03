"use client";

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Info } from "lucide-react";
import { useInvoices } from "@/context/InvoicesContext";
import { usePurchasing } from "@/context/PurchasingContext";
import { useOwners } from "@/context/OwnersContext";
import { depositHeld } from "@/lib/owner-utils";
import { formatPrice, cn } from "@/lib/utils";

/**
 * WHERE THE MONEY STANDS - the balances, not the trading.
 *
 * Profit & Loss above answers "how did this period go". It cannot
 * answer "what are we owed, what do we owe, and what is somebody else
 * holding", because none of those are income or costs - they are
 * positions, and they carry on existing between periods.
 *
 * This is not a balance sheet. There is no double entry behind it and
 * nothing here is forced to reconcile with anything else. It is the
 * three balances the system already knows, gathered in one place
 * instead of being scattered across three pages - which is the gap a
 * shop actually feels when it asks "are we short this month".
 *
 * ALL TIME, deliberately. A debt does not belong to the month it was
 * incurred; it is owed until it is paid. The Outstanding figure on
 * Profit & Loss is a different number on purpose - that one is scoped
 * to the period being viewed.
 */
export function MoneyPosition() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchasing();
  const { payments } = useOwners();

  const position = useMemo(() => {
    const owedToUs = invoices.reduce((sum, i) => sum + (i.dueAmount ?? 0), 0);
    const owedBySupplier = purchases.reduce((sum, p) => sum + (p.dueAmount ?? 0), 0);
    const held = depositHeld(payments);
    return { owedToUs, owedBySupplier, held };
  }, [invoices, purchases, payments]);

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Where the money stands</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Balances, not this period&apos;s trading. None of these are profit or
          cost, and all three are all-time rather than scoped to the dates above.
        </p>
      </div>

      <dl className="grid gap-px bg-border sm:grid-cols-3">
        <Cell
          Icon={ArrowDownLeft}
          label="Customers owe us"
          value={formatPrice(position.owedToUs)}
          hint="Billed and not yet collected, across every sale"
          tone={position.owedToUs > 0 ? "warn" : "plain"}
        />
        <Cell
          Icon={ArrowUpRight}
          label="We owe suppliers"
          value={formatPrice(position.owedBySupplier)}
          hint="Unpaid on purchases received"
          tone={position.owedBySupplier > 0 ? "bad" : "plain"}
        />
        <Cell
          Icon={Landmark}
          label="Landlord holds"
          value={formatPrice(position.held)}
          hint="Advance and security, less anything refunded"
        />
      </dl>

      <p className="flex items-start gap-2 border-t border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        <span>
          These are not a balance sheet. Nothing here is double-entered, so a
          mistake has nowhere to show up as an imbalance - they are the balances
          the system happens to know, shown together because the shop needs them
          together.
        </span>
      </p>
    </section>
  );
}

function Cell({
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
  tone?: "plain" | "warn" | "bad";
}) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-heading text-xl font-bold tabular-nums",
          tone === "bad" ? "text-destructive" : tone === "warn" ? "text-gold-deep" : "text-foreground"
        )}
      >
        {value}
      </dd>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
