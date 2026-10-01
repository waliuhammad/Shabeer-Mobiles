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
import { useOwners } from "@/context/OwnersContext";
import {
  EMPTY_OWNER_FORM,
  toOwnerFormData,
  totalSharePercent,
  validateOwner,
} from "@/lib/owner-utils";
import { isValidPakistaniPhone } from "@/lib/validation";
import { OWNER_ROLES } from "@/types";
import type { Owner, OwnerErrors, OwnerFormData, OwnerRole, OwnerStatus } from "@/types";

interface OwnerFormProps {
  /** Present = edit mode, absent = create mode. */
  owner?: Owner;
}

/**
 * ONE form, two modes - the same arrangement SupplierForm uses, so
 * there is one place to change when a field is added.
 */
export function OwnerForm({ owner }: OwnerFormProps) {
  const router = useRouter();
  const { owners, createOwner, updateOwner } = useOwners();

  const [data, setData] = useState<OwnerFormData>(() =>
    owner ? toOwnerFormData(owner) : EMPTY_OWNER_FORM
  );
  const [errors, setErrors] = useState<OwnerErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof OwnerFormData>(key: K, value: OwnerFormData[K]) => {
    const next = { ...data, [key]: value };
    setData(next);
    // Only clear errors already on screen; do not start complaining
    // about fields the person has not reached yet.
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  /**
   * What the shares would add up to once this one is saved.
   *
   * SHOWN, NOT ENFORCED - see totalSharePercent() for why. A landlord
   * holds no share of the shop, and two partners may have agreed 60/30
   * with the rest unallocated, so a form that refused anything but
   * exactly 100 would be wrong more often than right.
   */
  const othersTotal = totalSharePercent(owners.filter((o) => o.id !== owner?.id));
  const thisShare = data.sharePercent.trim() ? Number(data.sharePercent) : 0;
  const projected =
    data.status === "active" && Number.isFinite(thisShare)
      ? othersTotal + thisShare
      : othersTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const found = validateOwner(data);
    if (data.phone.trim() && !isValidPakistaniPhone(data.phone)) {
      found.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      if (owner) {
        const updated = await updateOwner(owner.id, data);
        if (!updated) {
          toast.error("Could not save.", { description: "That record no longer exists." });
          return;
        }
        toast.success("Saved.", { description: updated.name });
        router.push(`/admin/owners/${owner.id}`);
      } else {
        const created = await createOwner(data);
        toast.success("Added.", { description: created.name });
        router.push(`/admin/owners/${created.id}`);
      }
      router.refresh();
    } catch {
      // A refused write must be visible. Silently returning to the list
      // would look exactly like success.
      toast.error("Could not save.", {
        description: "The write was refused. Check you are signed in as an owner or manager.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Who they are</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full name"
            value={data.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            placeholder="e.g. Jawad Raza"
            required
          />

          <div>
            <label htmlFor="owner-role" className="mb-1.5 block text-sm font-medium text-foreground">
              Role
            </label>
            <Select value={data.role} onValueChange={(v) => set("role", v as OwnerRole)}>
              <SelectTrigger id="owner-role" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormField
            label="Phone"
            type="tel"
            value={data.phone}
            onChange={(v) => set("phone", v)}
            error={errors.phone}
            placeholder="0300 1234567"
            required
          />

          <FormField
            label="Email (optional)"
            type="email"
            value={data.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
            placeholder="name@example.com"
          />
        </div>

        <div className="mt-4">
          <FormField
            label="Address (optional)"
            value={data.address}
            onChange={(v) => set("address", v)}
            placeholder="House, street, area"
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Stake</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Share % (optional)"
            type="number"
            value={data.sharePercent}
            onChange={(v) => set("sharePercent", v)}
            error={errors.sharePercent}
            placeholder="e.g. 50"
          />

          <div>
            <label htmlFor="owner-status" className="mb-1.5 block text-sm font-medium text-foreground">
              Status
            </label>
            <Select value={data.status} onValueChange={(v) => set("status", v as OwnerStatus)}>
              <SelectTrigger id="owner-status" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Leave the share blank where there is no agreed percentage - a landlord
          who owns the building holds none of the shop, and a blank says that
          where a 0 would not. Active shares currently total{" "}
          <strong className="font-semibold text-foreground">
            {projected.toFixed(projected % 1 === 0 ? 0 : 1)}%
          </strong>
          {projected > 100 && " - worth checking, that is over 100%."}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="owner-notes" className="mb-1.5 block text-sm font-medium text-foreground">
          Notes (optional)
        </label>
        <textarea
          id="owner-notes"
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Agreement terms, what they are responsible for, anything worth remembering."
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          This is a contact record. Listing somebody here does not give them a
          sign-in, and removing them does not take one away.
        </p>
      </section>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
          <Link href={owner ? `/admin/owners/${owner.id}` : "/admin/owners"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={saving} className="h-10 gap-1.5 px-4 text-sm">
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving..." : owner ? "Save changes" : "Add person"}
        </Button>
      </div>
    </form>
  );
}
