"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { BUSINESS } from "@/lib/constants";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { ShopSettings } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:settings:v1";

/**
 * The settings store.
 *
 * The DEFAULTS are read from lib/constants.ts rather than re-typed, so
 * there is still one source for the shop's details and this page starts
 * showing whatever the code currently says - including the placeholders
 * that need replacing.
 */
const DEFAULTS: ShopSettings = {
  name: BUSINESS.name,
  tagline: BUSINESS.tagline,
  description: BUSINESS.description,
  phone: BUSINESS.phone,
  phoneDisplay: BUSINESS.phoneDisplay,
  whatsapp: BUSINESS.whatsapp,
  email: BUSINESS.email,
  shop: BUSINESS.address.shop,
  plaza: BUSINESS.address.plaza,
  street: BUSINESS.address.street,
  city: BUSINESS.address.city,
  country: BUSINESS.address.country,
  hours: BUSINESS.hours.map((h) => ({ days: h.days, time: h.time })),
  deliveryCharge: 0,
  freeDeliveryThreshold: 0,
  defaultLowStockThreshold: 5,
  receiptFooter: "Thank you for shopping at Shabbir Mobiles.",
};

/**
 * The generic placeholders this project originally shipped with.
 *
 * All four have since been replaced with the shop's real details, so
 * this now reads as a REGRESSION GUARD rather than a live warning: if a
 * merge or a bad edit ever puts one of these strings back, the settings
 * page says so loudly instead of letting the shop quietly publish a
 * phone number nobody answers.
 *
 * STILL UNCONFIRMED, and not catchable here because it is an array
 * rather than a string: the opening hours.
 */
const PLACEHOLDERS: Partial<Record<keyof ShopSettings, string>> = {
  phone: "+92 300 0000000",
  phoneDisplay: "0300 - 0000000",
  whatsapp: "923000000000",
  email: "info@shabbirmobiles.com",
};

interface SettingsContextValue {
  settings: ShopSettings;
  /** Defaults straight from lib/constants.ts, for the Reset button. */
  defaults: ShopSettings;
  saveSettings: (next: ShopSettings) => void;
  resetSettings: () => void;
  /** Is this field still the shipped placeholder? */
  isPlaceholder: (field: keyof ShopSettings) => boolean;
  /** How many fields still need real values. */
  placeholderCount: number;
  hasLocalChanges: boolean;
  isHydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStored(): ShopSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Merged over the defaults so a settings object saved before a new
    // field existed does not leave that field undefined.
    return { ...DEFAULTS, ...(parsed as Partial<ShopSettings>) };
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<ShopSettings | null>(readStored);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      if (local) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked or full - still works for this session.
    }
  }, [local]);

  const settings = useMemo(
    () => (isHydrated && local ? local : DEFAULTS),
    [local, isHydrated]
  );

  const saveSettings = useCallback((next: ShopSettings) => setLocal(next), []);
  const resetSettings = useCallback(() => setLocal(null), []);

  const isPlaceholder = useCallback(
    (field: keyof ShopSettings) => {
      const placeholder = PLACEHOLDERS[field];
      if (!placeholder) return false;
      return settings[field] === placeholder;
    },
    [settings]
  );

  const placeholderCount = useMemo(
    () =>
      (Object.keys(PLACEHOLDERS) as (keyof ShopSettings)[]).filter(isPlaceholder)
        .length,
    [isPlaceholder]
  );

  const value = useMemo(
    () => ({
      settings,
      defaults: DEFAULTS,
      saveSettings,
      resetSettings,
      isPlaceholder,
      placeholderCount,
      hasLocalChanges: isHydrated && local !== null,
      isHydrated,
    }),
    [settings, saveSettings, resetSettings, isPlaceholder, placeholderCount, local, isHydrated]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside a <SettingsProvider>");
  }
  return context;
}
