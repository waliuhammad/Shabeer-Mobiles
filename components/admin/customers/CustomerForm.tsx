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
import { useCustomers } from "@/context/CustomersContext";
import { validateCustomer, type CustomerErrors } from "@/lib/customer-utils";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import type { Customer, CustomerFormData, CustomerStatus } from "@/types";

interface CustomerFormProps {
  /** Present = edit mode, absent = create mode. */
  customer?: Customer;
}

const EMPTY: CustomerFormData = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "Multan",
  notes: "",
  status: "ACTIVE",
};

/**
 * ONE form, two modes.
 *
 * Create and edit differ only in what they start with and where they go
 * afterwards. Two forms would drift the first time a field was added to
 * one of them - the same reasoning as SupplierForm.
 *
 * Validation comes from lib/customer-utils.ts, so the POS quick-create
 * dialog enforces exactly the same rules as this page.
 */
export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const { createCustomer, updateCustomer } = useCustomers();
  const isEdit = Boolean(customer);

  const [data, setData] = useState<CustomerFormData>(
    customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          notes: customer.notes,
          status: customer.status,
        }
      : EMPTY
  );
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const runValidation = (next: CustomerFormData) =>
    validateCustomer(next, isValidPakistaniPhone, isValidEmail);

  const set = (field: keyof CustomerFormData, value: string) => {
    const next = { ...data, [field]: value };
    setData(next);
    if (touched.has(field)) setErrors(onlyTouched(runValidation(next), touched));
  };

  const blur = (field: keyof CustomerFormData) => {
    const nextTouched = new Set(touched).add(field);
    setTouched(nextTouched);
    setErrors(onlyTouched(runValidation(data), nextTouched));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = runValidation(data);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(["name", "phone", "email"]));
      setErrors(found);
      return;
    }

    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, data);
        toast.success("Customer updated.", { description: data.name });
        router.push(`/admin/customers/${customer.id}`);
        return;
      }

      const created = await createCustomer(data);
      toast.success("Customer added.", { description: created.name });
      router.push(`/admin/customers/${created.id}`);
    } catch (error) {
      toast.error("Could not save.", {
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full Name"
            value={data.name}
            onChange={(v) => set("name", v)}
            onBlur={() => blur("name")}
            error={errors.name}
            placeholder="Muhammad Ahmed"
            autoComplete="name"
            required
          />

          <FormField
            label="Phone"
            type="tel"
            value={data.phone}
            onChange={(v) => set("phone", v)}
            onBlur={() => blur("phone")}
            error={errors.phone}
            placeholder="0300 1234567"
            autoComplete="tel"
            required
          />

          <FormField
            label="Email (optional)"
            type="email"
            value={data.email}
            onChange={(v) => set("email", v)}
            onBlur={() => blur("email")}
            error={errors.email}
            placeholder="customer@example.com"
            autoComplete="email"
          />

          <FormField
            label="City"
            value={data.city}
            onChange={(v) => set("city", v)}
            placeholder="Multan"
            autoComplete="address-level2"
          />

          <FormField
            label="Address"
            value={data.address}
            onChange={(v) => set("address", v)}
            placeholder="House / shop number, street, area"
            textarea
            rows={2}
            className="sm:col-span-2"
          />

          <div>
            <label
              htmlFor="customer-status"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Status
            </label>
            <Select
              value={data.status}
              onValueChange={(v) => set("status", v as CustomerStatus)}
            >
              <SelectTrigger id="customer-status" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Inactive hides them from the POS picker but keeps their history.
            </p>
          </div>

          <FormField
            label="Notes"
            value={data.notes}
            onChange={(v) => set("notes", v)}
            placeholder="Delivery preferences, anything worth remembering"
            textarea
            rows={3}
            className="sm:col-span-2"
          />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Notes are internal. Customers are never deleted - their past orders
          record who bought what, and removing the customer would orphan every
          one of them. Set the status to Inactive instead.
        </p>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
          <Link href={customer ? `/admin/customers/${customer.id}` : "/admin/customers"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button
          type="submit"
          className="h-10 gap-1.5 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? "Save Changes" : "Save Customer"}
        </Button>
      </div>
    </form>
  );
}

function onlyTouched(all: CustomerErrors, touched: Set<string>): CustomerErrors {
  const out: CustomerErrors = {};
  for (const key of Object.keys(all) as (keyof CustomerErrors)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
