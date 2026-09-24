"use client";

import {
  createContext, useCallback, useContext, useMemo,
} from "react";
import { BUSINESS } from "@/lib/constants";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc, removeDoc } from "@/lib/firebase/write";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { ShopSettings } from "@/types";


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
  saveSettings: (next: ShopSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  /** Is this field still the shipped placeholder? */
  isPlaceholder: (field: keyof ShopSettings) => boolean;
  /** How many fields still need real values. */
  placeholderCount: number;
  hasLocalChanges: boolean;
  isHydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** The shape read back from Firestore: the fields plus the doc id. */
type StoredSettings = Partial<ShopSettings> & { id: string };

/**
 * THE shop settings document. One row, fixed id.
 *
 * A collection would imply there could be several sets of shop details,
 * which there cannot - there is one shop.
 */
const SETTINGS_DOC_ID = "shop";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useIsHydrated();

  /**
   * NOW IN FIRESTORE, not localStorage.
   *
   * localStorage is one browser's private scratchpad. The owner changed
   * the shop phone number on their laptop and the counter PC kept
   * printing the old one on every invoice, with nothing on either screen
   * to suggest they disagreed. Clearing site data lost the lot.
   *
   * This was the last context still on it - everything else moved when
   * the app moved to Firestore, and this one was missed.
   *
   * The subscription is live, so a change made on the laptop reaches the
   * counter without a refresh, and firestore.rules already restricts
   * writes to the owner while letting anyone read (the public footer
   * needs the address and hours).
   */
  const { items } = useFirestoreCollection<StoredSettings>(
    COLLECTIONS.settings,
    (doc) => ({ id: doc.id, ...(doc.data() as Partial<ShopSettings>) })
  );

  const stored = useMemo(
    () => items.find((row) => row.id === SETTINGS_DOC_ID) ?? null,
    [items]
  );

  const settings = useMemo(() => {
    if (!isHydrated || !stored) return DEFAULTS;
    // Merged over the defaults so a document saved before a new field
    // existed does not leave that field undefined.
    // The doc id is not a settings field; strip it before merging.
    const { id, ...fields } = stored;
    void id;
    return { ...DEFAULTS, ...fields } as ShopSettings;
  }, [stored, isHydrated]);

  const saveSettings = useCallback(async (next: ShopSettings) => {
    await writeDoc(COLLECTIONS.settings, SETTINGS_DOC_ID, { ...next });
  }, []);

  /**
   * Reset deletes the document, so `settings` falls back to DEFAULTS -
   * the values in lib/constants.ts. Writing the defaults in instead
   * would look identical on screen but would lose the distinction
   * between "never configured" and "configured to match the defaults".
   */
  const resetSettings = useCallback(async () => {
    await removeDoc(COLLECTIONS.settings, SETTINGS_DOC_ID);
  }, []);

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
      hasLocalChanges: isHydrated && stored !== null,
      isHydrated,
    }),
    [settings, saveSettings, resetSettings, isPlaceholder, placeholderCount, stored, isHydrated]
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
