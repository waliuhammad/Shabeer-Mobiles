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
import { usePurchasing } from "@/context/PurchasingContext";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import type { Supplier, SupplierFormData, SupplierStatus } from "@/types";

interface SupplierFormProps {
  /** Present = edit mode, absent = create mode. */
  supplier?: Supplier;
}

const EMPTY: SupplierFormData = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "Multan",
  notes: "",
  status: "active",
};

type Errors = Partial<Record<keyof SupplierFormData, string>>;

function validate(data: SupplierFormData): Errors {
  const errors: Errors = {};

  // The ONLY required field. A supplier you only know by name is still a
  // useful record; demanding an email for a wholesaler you deal with by
  // phone just teaches people to type junk.
  if (data.name.trim().length < 2) {
    errors.name = "Supplier name is required.";
  }
  if (data.phone.trim() && !isValidPakistaniPhone(data.phone)) {
    errors.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
  }
  if (data.email.trim() && !isValidEmail(data.email.trim())) {
    errors.email = "That email address does not look right.";
  }

  return errors;
}

/**
 * ONE form, two modes.
 *
 * Create and edit differ only in what they start with and where they go
 * afterwards - the fields, validation and layout are identical. Two
 * separate forms would drift the first time a field was added to one.
 */
export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();
  const { createSupplier, updateSupplier } = usePurchasing();
  const isEdit = Boolean(supplier);

  const [data, setData] = useState<SupplierFormData>(
    supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          city: supplier.city,
          notes: supplier.notes,
          status: supplier.status,
        }
      : EMPTY
  );
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Set<keyof SupplierFormData>>(new Set());

  const set = (field: keyof SupplierFormData, value: string) => {
    const next = { ...data, [field]: value };
    setData(next);
    if (touched.has(field)) setErrors(visible(validate(next), touched));
  };

  const blur = (field: keyof SupplierFormData) => {
    const nextTouched = new Set(touched).add(field);
    setTouched(nextTouched);
    setErrors(visible(validate(data), nextTouched));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(data);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(Object.keys(data) as (keyof SupplierFormData)[]));
      setErrors(found);
      return;
    }

    if (isEdit && supplier) {
      updateSupplier(supplier.id, data);
      toast.success("Supplier updated.", { description: data.name });
      router.push(`/admin/suppliers/${supplier.id}`);
      return;
    }

    const created = await createSupplier(data);
    toast.success("Supplier added.", { description: created.name });
    router.push(`/admin/suppliers/${created.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Supplier Name"
            value={data.name}
            onChange={(v) => set("name", v)}
            onBlur={() => blur("name")}
            error={errors.name}
            placeholder="ABC Mobile Wholesale"
            required
            className="sm:col-span-2"
          />

          <FormField
            label="Contact Person"
            value={data.contactPerson}
            onChange={(v) => set("contactPerson", v)}
            placeholder="Ahmed"
          />

          <FormField
            label="Phone"
            type="tel"
            value={data.phone}
            onChange={(v) => set("phone", v)}
            onBlur={() => blur("phone")}
            error={errors.phone}
            placeholder="0300 1234567"
          />

          <FormField
            label="Email"
            type="email"
            value={data.email}
            onChange={(v) => set("email", v)}
            onBlur={() => blur("email")}
            error={errors.email}
            placeholder="supplier@example.com"
          />

          <FormField
            label="City"
            value={data.city}
            onChange={(v) => set("city", v)}
            placeholder="Multan"
          />

          <FormField
            label="Address"
            value={data.address}
            onChange={(v) => set("address", v)}
            placeholder="Shop number, street, area"
            textarea
            rows={2}
            className="sm:col-span-2"
          />

          <div>
            <label
              htmlFor="supplier-status"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Status
            </label>
            <Select
              value={data.status}
              onValueChange={(v) => set("status", v as SupplierStatus)}
            >
              <SelectTrigger id="supplier-status" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Inactive hides them from new purchases but keeps their history.
            </p>
          </div>

          <FormField
            label="Notes"
            value={data.notes}
            onChange={(v) => set("notes", v)}
            placeholder="Delivery schedule, payment terms, what they are good for"
            textarea
            rows={3}
            className="sm:col-span-2"
          />
        </div>

        {isEdit && (
          // Deactivate, never delete. A supplier with purchase history
          // explains where stock came from and what it cost - removing
          // them would orphan every one of those records.
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
            Suppliers are never deleted. Set the status to Inactive to stop using
            them - their past purchases must stay, because those records explain
            where existing stock came from and what it cost.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
          <Link href={supplier ? `/admin/suppliers/${supplier.id}` : "/admin/suppliers"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button
          type="submit"
          className="h-10 gap-1.5 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? "Save Changes" : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
}

function visible(all: Errors, touched: Set<keyof SupplierFormData>): Errors {
  const out: Errors = {};
  for (const key of Object.keys(all) as (keyof SupplierFormData)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
