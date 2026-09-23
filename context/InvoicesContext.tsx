"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc } from "@/lib/firebase/write";
import { useAuth } from "@/context/AuthContext";
import type { Invoice, InvoiceLine, POSPaymentMethod, POSPaymentStatus } from "@/types";

/**
 * Completed counter sales - live Firestore.
 *
 * TWO DIFFERENT LIFETIMES, TWO DIFFERENT HOMES
 * --------------------------------------------
 * hooks/use-pos.ts still holds the bill IN PROGRESS in React state, and
 * deliberately does not persist it: a half-rung-up cart must not survive
 * a refresh, or a cashier returns from lunch to a stranger's basket.
 *
 * This context holds bills that are FINISHED. Those are permanent
 * business records - they are the shop's revenue - so they go to the
 * database, where the owner's laptop sees them the moment they are rung
 * up.
 *
 * APPEND ONLY. A completed sale is never edited or removed; correcting
 * one means issuing a return, which this project does not model yet.
 *
 * A NOTE ON WHO CAN READ THIS: invoices carry purchasePrice on every
 * line, so firestore.rules restricts reads to owner and manager. A
 * cashier can create a sale but cannot browse the history and read the
 * shop's margins out of it.
 */

interface InvoicesContextValue {
  invoices: Invoice[];
  getInvoice: (invoiceNumber: string) => Invoice | undefined;
  recordInvoice: (invoice: Invoice) => Promise<void>;
  nextInvoiceSequence: number;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

function mapLine(raw: unknown): InvoiceLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const l = raw as Record<string, unknown>;
  if (typeof l.productId !== "string" || typeof l.quantity !== "number") return null;
  return {
    productId: l.productId,
    name: typeof l.name === "string" ? l.name : "",
    sku: typeof l.sku === "string" ? l.sku : "",
    quantity: l.quantity,
    price: typeof l.price === "number" ? l.price : 0,
    total: typeof l.total === "number" ? l.total : 0,
    purchasePrice: typeof l.purchasePrice === "number" ? l.purchasePrice : 0,
  };
}

function mapInvoice(doc: QueryDocumentSnapshot): Invoice | null {
  const d = doc.data();
  if (typeof d.invoiceNumber !== "string" || !Array.isArray(d.items)) return null;
  const items = d.items.map(mapLine).filter((l): l is InvoiceLine => l !== null);
  const status: POSPaymentStatus =
    d.paymentStatus === "PAID" || d.paymentStatus === "PARTIAL" || d.paymentStatus === "DUE"
      ? d.paymentStatus
      : "DUE";
  const method: POSPaymentMethod =
    d.paymentMethod === "card" || d.paymentMethod === "bank-transfer" || d.paymentMethod === "other"
      ? d.paymentMethod
      : "cash";
  return {
    id: doc.id,
    invoiceNumber: d.invoiceNumber,
    customerId: typeof d.customerId === "string" ? d.customerId : "",
    customerName: typeof d.customerName === "string" ? d.customerName : "",
    customerPhone: typeof d.customerPhone === "string" ? d.customerPhone : "",
    items,
    subtotal: typeof d.subtotal === "number" ? d.subtotal : 0,
    discount: typeof d.discount === "number" ? d.discount : 0,
    total: typeof d.total === "number" ? d.total : 0,
    paidAmount: typeof d.paidAmount === "number" ? d.paidAmount : 0,
    dueAmount: typeof d.dueAmount === "number" ? d.dueAmount : 0,
    paymentMethod: method,
    paymentStatus: status,
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
    cashierName: typeof d.cashierName === "string" ? d.cashierName : "",
  };
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const enabled =
    !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";

  const state = useFirestoreCollection<Invoice>(COLLECTIONS.invoices, mapInvoice, {
    enabled,
  });

  const invoices = useMemo(
    () => [...state.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.items]
  );

  const getInvoice = useCallback(
    (invoiceNumber: string) => invoices.find((i) => i.invoiceNumber === invoiceNumber),
    [invoices]
  );

  const recordInvoice = useCallback(async (invoice: Invoice) => {
    await writeDoc(COLLECTIONS.invoices, invoice.id, invoice);
  }, []);

  /**
   * Where the next counter bill's numbering continues from.
   *
   * MOCK ONLY, and it is the weak point of doing this client-side: two
   * tills open at once would both read the same highest number and both
   * claim it. A real invoice number must be issued by the server inside
   * the same transaction that writes the sale - most likely from a
   * Firestore counter document.
   *
   * A cashier cannot read this collection, so they always start from 1
   * and will collide. That is a known limitation of the current setup,
   * not a design choice.
   */
  const nextInvoiceSequence = useMemo(() => {
    const highest = invoices.reduce((max, invoice) => {
      const n = Number(invoice.invoiceNumber.replace(/\D/g, ""));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return highest + 1;
  }, [invoices]);

  const value = useMemo(
    () => ({
      invoices,
      getInvoice,
      recordInvoice,
      nextInvoiceSequence,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [invoices, getInvoice, recordInvoice, nextInvoiceSequence, state.loading, state.error]
  );

  return <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>;
}

export function useInvoices(): InvoicesContextValue {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error("useInvoices must be used inside an <InvoicesProvider>");
  }
  return context;
}
