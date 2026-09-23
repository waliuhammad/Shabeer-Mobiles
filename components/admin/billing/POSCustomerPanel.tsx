"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { User, UserPlus, X, Phone, MapPin, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/FormField";
import { useCustomers } from "@/context/CustomersContext";
import { searchCustomers, validateCustomer } from "@/lib/customer-utils";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { WALK_IN_CUSTOMER_ID } from "@/types";
import type { Customer } from "@/types";

interface POSCustomerPanelProps {
  /** The central customer id attached to this bill. */
  customerId: string;
  onChange: (customerId: string) => void;
}

/**
 * Who the bill is for.
 *
 * REFACTORED IN STEP 7. This used to hold its own POSCustomer shape and
 * invent a fresh anonymous object per sale. It now reads and writes the
 * CENTRAL customer directory:
 *
 *   - "Walk-in Customer" is ONE stable record (cus_walkin), reused for
 *     every anonymous sale. Not a new row each time - that would bury
 *     the customer list under hundreds of empty entries within a month.
 *   - Searching finds real customers by name, phone or email.
 *   - Creating one here adds it to the SAME directory the admin
 *     customer list reads, so it appears there immediately.
 *
 * The bill carries a customerId, which is what lets the admin later see
 * a customer's counter sales and online orders in one history.
 */
export function POSCustomerPanel({ customerId, onChange }: POSCustomerPanelProps) {
  const { getCustomer, selectableCustomers, createCustomer } = useCustomers();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", address: "" });
  const [error, setError] = useState<string | undefined>();

  const customer = getCustomer(customerId);
  const isWalkIn = customerId === WALK_IN_CUSTOMER_ID;

  const results = useMemo(
    () => searchCustomers(selectableCustomers, query, "ACTIVE").slice(0, 8),
    [selectableCustomers, query]
  );

  function select(next: Customer) {
    onChange(next.id);
    setPickerOpen(false);
    setQuery("");
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The SAME validator the admin customer form uses, so a customer
    // created at the counter meets identical standards.
    const errors = validateCustomer(draft, isValidPakistaniPhone, isValidEmail);
    const first = errors.name ?? errors.phone ?? errors.email;
    if (first) {
      setError(first);
      return;
    }

    const created = createCustomer({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
      city: "Multan",
      notes: "Created at the counter during a sale.",
      status: "ACTIVE",
    });

    // Newly created customer becomes the selected one immediately - the
    // cashier should not have to go and find them.
    onChange(created.id);
    toast.success("Customer added.", { description: created.name });

    setDraft({ name: "", phone: "", email: "", address: "" });
    setError(undefined);
    setCreateOpen(false);
    setPickerOpen(false);
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-accent">
            <User className="size-4" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {customer?.name ?? "Walk-in Customer"}
            </p>

            {customer?.phone ? (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Phone className="size-3 shrink-0" aria-hidden="true" />
                {customer.phone}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isWalkIn ? "No details captured" : "No phone number"}
              </p>
            )}

            {customer?.address && (
              <p className="flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{customer.address}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!isWalkIn && (
            <button
              type="button"
              onClick={() => onChange(WALK_IN_CUSTOMER_ID)}
              aria-label="Clear customer and use Walk-in Customer"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
          >
            <Search className="size-3.5" aria-hidden="true" />
            {isWalkIn ? "Select" : "Change"}
          </Button>
        </div>
      </div>

      {/* ---------------- CUSTOMER PICKER ---------------- */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Search the shop&apos;s customer list, or add someone new without
              leaving the bill.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <label htmlFor="pos-customer-search" className="sr-only">
              Search customers by name, phone or email
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="pos-customer-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone or email..."
              autoFocus
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {/* Walk-in is always offered as an explicit first choice. */}
            <li>
              <button
                type="button"
                onClick={() => { onChange(WALK_IN_CUSTOMER_ID); setPickerOpen(false); setQuery(""); }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  isWalkIn ? "border-secondary bg-cyan-soft/50" : "border-border hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium text-foreground">
                  Walk-in Customer
                </span>
                {isWalkIn && <Check className="size-4 shrink-0 text-secondary" aria-hidden="true" />}
              </button>
            </li>

            {results.length === 0 && query.trim() !== "" && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                No customer matches &ldquo;{query.trim()}&rdquo;.
              </li>
            )}

            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    c.id === customerId
                      ? "border-secondary bg-cyan-soft/50"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </span>
                  </span>
                  {c.id === customerId && (
                    <Check className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
              className="h-10"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 gap-1.5 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              New Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- QUICK CREATE ---------------- */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setError(undefined); setCreateOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>
              Saved to the shop&apos;s customer list and selected for this bill.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <FormField
              label="Customer Name"
              value={draft.name}
              onChange={(v) => { setDraft({ ...draft, name: v }); setError(undefined); }}
              placeholder="Ali Khan"
              required
            />
            <FormField
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(v) => { setDraft({ ...draft, phone: v }); setError(undefined); }}
              placeholder="0300 1234567"
              required
            />
            <FormField
              label="Email (optional)"
              type="email"
              value={draft.email}
              onChange={(v) => { setDraft({ ...draft, email: v }); setError(undefined); }}
              placeholder="customer@example.com"
            />
            <FormField
              label="Address (optional)"
              value={draft.address}
              onChange={(v) => setDraft({ ...draft, address: v })}
              placeholder="House / shop number, street, area"
              textarea
              rows={2}
            />

            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <p className="rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              This customer joins the shop&apos;s central list - the same one
              /admin/customers shows. Demo only: it is stored in this browser
              until Firebase is connected.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-10">
                Cancel
              </Button>
              <Button type="submit" className="h-10 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep">
                Save &amp; Use
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
