"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LAST_SEEDED_INVOICE_SEQUENCE, seedInvoices } from "@/data/invoices";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { Invoice } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:invoices:v1";

/**
 * Completed counter sales.
 *
 * TWO DIFFERENT LIFETIMES, TWO DIFFERENT HOMES
 * --------------------------------------------
 * hooks/use-pos.ts holds the bill IN PROGRESS and deliberately does not
 * persist it: a half-rung-up cart must not survive a refresh, or a
 * cashier returns from lunch to a stranger's abandoned basket.
 *
 * This context holds bills that are FINISHED. Those are permanent
 * business records - they are the shop's revenue - so they do persist.
 *
 * Only appended to. A completed sale is never edited or removed here;
 * correcting one will mean issuing a return, which this project does
 * not model yet.
 *
 * KNOWN LIMITATION: localStorage, so counter sales rung up on the shop
 * machine are invisible on the owner's laptop. This is precisely the
 * problem a shared database exists to solve, and it is why the revenue
 * figures here are a demo rather than an accounting record.
 */
interface InvoicesContextValue {
  invoices: Invoice[];
  getInvoice: (invoiceNumber: string) => Invoice | undefined;
  /** Appends a finished bill. Called once, when a sale completes. */
  recordInvoice: (invoice: Invoice) => void;
  /** Where the next counter bill's numbering continues from. */
  nextInvoiceSequence: number;
  resetInvoices: () => void;
  localChangeCount: number;
  isHydrated: boolean;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

function readStored(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is Invoice =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as Invoice).invoiceNumber === "string" &&
        Array.isArray((i as Invoice).items)
    );
  } catch {
    return [];
  }
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Invoice[]>(readStored);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {
      // Storage blocked or full - still works for this session.
    }
  }, [local]);

  const invoices = useMemo(() => {
    if (!isHydrated) return seedInvoices;
    // Append-only, so a simple concat is correct - there are no local
    // edits of seeded rows to shadow, unlike the other stores.
    const fresh = local.filter(
      (l) => !seedInvoices.some((s) => s.invoiceNumber === l.invoiceNumber)
    );
    return [...seedInvoices, ...fresh].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [local, isHydrated]);

  const getInvoice = useCallback(
    (invoiceNumber: string) =>
      invoices.find((i) => i.invoiceNumber === invoiceNumber),
    [invoices]
  );

  const recordInvoice = useCallback((invoice: Invoice) => {
    setLocal((current) =>
      current.some((i) => i.invoiceNumber === invoice.invoiceNumber)
        ? current
        : [...current, invoice]
    );
  }, []);

  /**
   * Continue the numbering past both the seed and anything rung up in
   * this browser, so a reload cannot hand out SM-INV-0004 twice.
   */
  const nextInvoiceSequence = useMemo(() => {
    if (!isHydrated) return LAST_SEEDED_INVOICE_SEQUENCE + 1;
    const highest = invoices.reduce((max, invoice) => {
      const digits = invoice.invoiceNumber.replace(/\D/g, "");
      const n = Number(digits);
      return Number.isFinite(n) && n > max ? n : max;
    }, LAST_SEEDED_INVOICE_SEQUENCE);
    return highest + 1;
  }, [invoices, isHydrated]);

  const resetInvoices = useCallback(() => setLocal([]), []);

  const value = useMemo(
    () => ({
      invoices,
      getInvoice,
      recordInvoice,
      nextInvoiceSequence,
      resetInvoices,
      localChangeCount: isHydrated ? local.length : 0,
      isHydrated,
    }),
    [
      invoices,
      getInvoice,
      recordInvoice,
      nextInvoiceSequence,
      resetInvoices,
      local.length,
      isHydrated,
    ]
  );

  return (
    <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>
  );
}

export function useInvoices(): InvoicesContextValue {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error("useInvoices must be used inside an <InvoicesProvider>");
  }
  return context;
}
