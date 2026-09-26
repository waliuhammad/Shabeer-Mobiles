"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { Save, RotateCcw, TriangleAlert, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { useSettings } from "@/context/SettingsContext";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import type { SettingsErrors, ShopSettings } from "@/types";

/**
 * /admin/settings.
 *
 * Everything lib/constants.ts hard-codes, made editable. The honest
 * caveat is stated on the page itself rather than buried: these values
 * do not reach the storefront yet, because the storefront is
 * server-rendered from the constants file while this store is one
 * browser's localStorage.
 */
export function SettingsView() {
  const { isHydrated } = useSettings();

  // HYDRATION GATE - load-bearing, not a loading spinner.
  //
  // Before hydration the store reports the lib/constants.ts defaults,
  // because localStorage cannot be read on the server. SettingsForm
  // seeds its useState from what it is handed on first render, so
  // mounting it now would freeze the DEFAULTS into the form and the next
  // save would silently overwrite everything that had been stored.
  if (!isHydrated) return null;
  return <SettingsForm />;
}

function SettingsForm() {
  const { settings, defaults, saveSettings, resetSettings, isPlaceholder, placeholderCount, hasLocalChanges } = useSettings();

  const [data, setData] = useState<ShopSettings>(settings);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ShopSettings>(field: K, value: ShopSettings[K]) =>
    setData((d) => ({ ...d, [field]: value }));

  const num = (field: keyof ShopSettings) => (v: string) =>
    set(field, (v.trim() === "" ? 0 : Number(v)) as ShopSettings[typeof field]);

  function validate(next: ShopSettings): SettingsErrors {
    const found: SettingsErrors = {};
    if (!next.name.trim()) found.name = "The shop needs a name.";
    if (!next.phone.trim()) found.phone = "A phone number is required.";
    else if (!isValidPakistaniPhone(next.phone)) found.phone = "Not a valid Pakistani number.";
    if (next.email.trim() && !isValidEmail(next.email)) found.email = "Not a valid email address.";
    if (next.whatsapp.trim() && !/^\d{10,15}$/.test(next.whatsapp)) {
      found.whatsapp = "Digits only, international format, no + sign.";
    }
    if (next.deliveryCharge < 0) found.deliveryCharge = "Cannot be negative.";
    if (next.freeDeliveryThreshold < 0) found.freeDeliveryThreshold = "Cannot be negative.";
    if (!Number.isInteger(next.defaultLowStockThreshold) || next.defaultLowStockThreshold < 0) {
      found.defaultLowStockThreshold = "Must be a whole number, zero or more.";
    }
    return found;
  }

  /**
   * Saving reaches Firestore now, so it can fail - a cashier pressing
   * this gets refused by Security Rules, and the old version would have
   * told them it worked. Both handlers await the write and report what
   * actually happened.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(data);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Check the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await saveSettings(data);
      toast.success("Settings saved.", {
        description: "Live everywhere - the shop PC and any other device.",
      });
    } catch {
      toast.error("Could not save.", {
        description: "Your role may not allow this change.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await resetSettings();
      setData(defaults);
      setErrors({});
      toast.success("Reset to the values in lib/constants.ts.");
    } catch {
      toast.error("Could not reset.", {
        description: "Your role may not allow this change.",
      });
    } finally {
      setSaving(false);
    }
  }

  const setHour = (index: number, field: "days" | "time", value: string) =>
    setData((d) => ({
      ...d,
      hours: d.hours.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));

  const addHour = () =>
    setData((d) => ({ ...d, hours: [...d.hours, { days: "", time: "" }] }));

  const removeHour = (index: number) =>
    setData((d) => ({ ...d, hours: d.hours.filter((_, i) => i !== index) }));

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-4xl">
      {placeholderCount > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-gold-deep">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">
              {placeholderCount} contact {placeholderCount === 1 ? "field is" : "fields are"}{" "}
              still a placeholder.
            </strong>{" "}
            The phone number, WhatsApp number and email shipped with the project are
            invented. They appear on the storefront footer, the contact page and every
            receipt, so a customer trying to reach the shop would fail. Replace them
            with the real details from the shop card.
          </span>
        </p>
      )}

      {/* ---------------- IDENTITY ---------------- */}
      <Section title="Shop Identity">
        <FormField label="Shop Name" value={data.name} onChange={(v) => set("name", v)}
          error={errors.name} required className="sm:col-span-2" />
        <FormField label="Tagline" value={data.tagline} onChange={(v) => set("tagline", v)}
          placeholder="Accessories & Repairing Lab" className="sm:col-span-2" />
        <FormField label="Description" value={data.description} onChange={(v) => set("description", v)}
          textarea rows={3} className="sm:col-span-2" />
      </Section>

      {/* ---------------- CONTACT ---------------- */}
      <Section title="Contact">
        <FormField label="Phone" type="tel" value={data.phone} onChange={(v) => set("phone", v)}
          error={errors.phone} placeholder="+92 300 1234567" required />
        <FormField label="Phone (as displayed)" value={data.phoneDisplay}
          onChange={(v) => set("phoneDisplay", v)} placeholder="0300 - 1234567" />
        <FormField label="WhatsApp" value={data.whatsapp} onChange={(v) => set("whatsapp", v)}
          error={errors.whatsapp} placeholder="923001234567" />
        <FormField label="Email" type="email" value={data.email} onChange={(v) => set("email", v)}
          error={errors.email} placeholder="shop@example.com" />

        {(isPlaceholder("phone") || isPlaceholder("email") || isPlaceholder("whatsapp")) && (
          <p className="text-[11px] text-gold-deep sm:col-span-2">
            Highlighted above: the fields still holding shipped placeholder values.
          </p>
        )}
      </Section>

      {/* ---------------- ADDRESS ---------------- */}
      <Section title="Address">
        <FormField label="Shop / Unit" value={data.shop} onChange={(v) => set("shop", v)} placeholder="Shop #20" />
        <FormField label="Plaza / Building" value={data.plaza} onChange={(v) => set("plaza", v)} placeholder="Abdul Rasheed Mobile Plaza" />
        <FormField label="Street" value={data.street} onChange={(v) => set("street", v)} placeholder="Ketchery Road" />
        <FormField label="City" value={data.city} onChange={(v) => set("city", v)} placeholder="Multan" />
        <FormField label="Country" value={data.country} onChange={(v) => set("country", v)} placeholder="Pakistan" />
      </Section>

      {/* ---------------- HOURS ---------------- */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Opening Hours</h3>
          <Button type="button" variant="outline" size="sm" onClick={addHour} className="h-9 gap-1.5 text-xs">
            <Plus className="size-3.5" aria-hidden="true" />Add row
          </Button>
        </div>

        <ul className="mt-3 space-y-2">
          {data.hours.map((h, i) => (
            <li key={i} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`hours-days-${i}`}>Days for row {i + 1}</label>
              <input
                id={`hours-days-${i}`} value={h.days}
                onChange={(e) => setHour(i, "days", e.target.value)}
                placeholder="Monday - Saturday"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
              />
              <label className="sr-only" htmlFor={`hours-time-${i}`}>Times for row {i + 1}</label>
              <input
                id={`hours-time-${i}`} value={h.time}
                onChange={(e) => setHour(i, "time", e.target.value)}
                placeholder="11:00 AM - 10:00 PM"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeHour(i)}
                aria-label={`Remove hours row ${i + 1}`} className="h-10 px-3">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          The hours shipped with the project were guessed. Confirm them against the
          shop before customers rely on them.
        </p>
      </section>

      {/* ---------------- TRADING ---------------- */}
      <Section title="Trading Rules">
        {/*
          Delivery only exists for online orders, and the shop does not
          take them. Two boxes asking what to charge for a delivery that
          cannot be requested are not neutral - somebody fills them in,
          reasonably expects something to happen, and nothing does.
        */}
        {ONLINE_ORDERING_ENABLED && (
          <>
            <FormField label="Delivery Charge (Rs)" type="number" value={String(data.deliveryCharge)}
              onChange={num("deliveryCharge")} error={errors.deliveryCharge} placeholder="0" />
            <FormField label="Free Delivery Above (Rs)" type="number" value={String(data.freeDeliveryThreshold)}
              onChange={num("freeDeliveryThreshold")} error={errors.freeDeliveryThreshold} placeholder="0 to disable" />
          </>
        )}
        <FormField label="Default Low-Stock Threshold" type="number" value={String(data.defaultLowStockThreshold)}
          onChange={num("defaultLowStockThreshold")} error={errors.defaultLowStockThreshold} placeholder="5" />
        <FormField label="Receipt Footer" value={data.receiptFooter}
          onChange={(v) => set("receiptFooter", v)}
          placeholder="Thank you for shopping at Shabbir Mobiles."
          textarea rows={2} className="sm:col-span-2" />
      </Section>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        <span>
          Saved to the shop database, so a change made here reaches the counter
          PC and any other device - not just this browser. The low-stock
          threshold is the starting value for a NEW product; each product keeps
          its own afterwards. The receipt footer prints at the bottom of every
          counter invoice.
        </span>
      </p>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleReset} disabled={!hasLocalChanges}
          className="h-10 gap-1.5 px-4 text-sm">
          <RotateCcw className="size-4" aria-hidden="true" />Reset to code defaults
        </Button>
        <Button type="submit" disabled={saving} className="h-10 gap-1.5 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep">
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4 first:mt-0 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
