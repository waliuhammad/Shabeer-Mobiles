"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { writeDoc } from "@/lib/firebase/write";
import { useExpenses } from "@/context/ExpensesContext";
import { COUNTER_SELLERS } from "@/lib/constants";
import {
  createOwnerId,
  createOwnerPaymentId,
  expenseCategoryFor,
  isCostKind,
  isOwnerPaymentKind,
  isOwnerRole,
  OWNER_PAYMENT_LABELS,
  parseSharePercent,
} from "@/lib/owner-utils";
import type {
  Owner,
  OwnerFormData,
  OwnerPayment,
  OwnerPaymentFormData,
} from "@/types";

/**
 * The people with a stake in the shop and the building.
 *
 * READ BY OWNER AND MANAGER ONLY, matching suppliers. These records
 * carry personal phone numbers and the share each person holds, which
 * is nobody's business at the till - a cashier has no reason to know
 * how the business is split.
 *
 * NOTHING HERE GRANTS ACCESS. Who may sign in is a Firebase custom
 * claim, checked by requireStaff() and requireRole(). A contact record
 * that quietly carried permissions would be a way to hand somebody the
 * keys while believing you had only written down their phone number.
 */
interface OwnersContextValue {
  owners: Owner[];
  getOwner: (id: string) => Owner | undefined;
  createOwner: (data: OwnerFormData) => Promise<Owner>;
  updateOwner: (id: string, data: OwnerFormData) => Promise<Owner | undefined>;

  /** Every payment made to the plaza owners, newest first. */
  payments: OwnerPayment[];
  getOwnerPayments: (ownerId: string) => OwnerPayment[];
  recordPayment: (ownerId: string, data: OwnerPaymentFormData) => Promise<OwnerPayment>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const OwnersContext = createContext<OwnersContextValue | null>(null);

export function OwnersProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const enabled = !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";
  const { createExpense } = useExpenses();

  const state = useFirestoreCollection<Owner>(
    COLLECTIONS.owners,
    (doc) => {
      const d = doc.data();
      if (typeof d.name !== "string") return null;
      return {
        id: doc.id,
        name: d.name,
        // An unrecognised role falls back rather than failing the whole
        // document - losing a person's phone number because somebody
        // renamed a role would be the wrong trade.
        role: isOwnerRole(d.role) ? d.role : "Other",
        phone: typeof d.phone === "string" ? d.phone : "",
        email: typeof d.email === "string" ? d.email : "",
        address: typeof d.address === "string" ? d.address : "",
        /**
         * null and 0 are different answers - "no agreed share" against
         * "a share of nothing" - so this does not collapse one into the
         * other with `?? 0`.
         */
        sharePercent: typeof d.sharePercent === "number" ? d.sharePercent : null,
        notes: typeof d.notes === "string" ? d.notes : "",
        status: d.status === "inactive" ? "inactive" : "active",
        createdAt:
          typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
        updatedAt:
          typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
      } satisfies Owner;
    },
    { enabled }
  );

  const owners = useMemo(
    () =>
      [...state.items].sort((a, b) => {
        // Active first, then by name. A former partner should not sit
        // above the person currently running the shop.
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [state.items]
  );

  const paymentsState = useFirestoreCollection<OwnerPayment>(
    COLLECTIONS.ownerPayments,
    (doc) => {
      const d = doc.data();
      if (!isOwnerPaymentKind(d.kind) || typeof d.amount !== "number") return null;
      return {
        id: doc.id,
        ownerId: typeof d.ownerId === "string" ? d.ownerId : "",
        ownerName: typeof d.ownerName === "string" ? d.ownerName : "",
        kind: d.kind,
        amount: d.amount,
        paidOn: typeof d.paidOn === "string" ? d.paidOn : new Date(0).toISOString(),
        periodMonth: typeof d.periodMonth === "string" ? d.periodMonth : "",
        notes: typeof d.notes === "string" ? d.notes : "",
        expenseId: typeof d.expenseId === "string" ? d.expenseId : undefined,
        paidBy: typeof d.paidBy === "string" ? d.paidBy : undefined,
        createdAt:
          typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
      } satisfies OwnerPayment;
    },
    { enabled }
  );

  const payments = useMemo(
    // By the date the money moved, not by when the row was typed -
    // six months of history entered today would otherwise read as one
    // block in whatever order it happened to be keyed in.
    () => [...paymentsState.items].sort((a, b) => b.paidOn.localeCompare(a.paidOn)),
    [paymentsState.items]
  );

  const getOwnerPayments = useCallback(
    (ownerId: string) => payments.filter((p) => p.ownerId === ownerId),
    [payments]
  );

  const getOwner = useCallback(
    (id: string) => owners.find((o) => o.id === id),
    [owners]
  );

  const fromForm = useCallback((data: OwnerFormData) => ({
    name: data.name.trim(),
    role: data.role,
    phone: data.phone.trim(),
    email: data.email.trim(),
    address: data.address.trim(),
    sharePercent: parseSharePercent(data.sharePercent),
    notes: data.notes.trim(),
    status: data.status,
  }), []);

  const createOwner = useCallback(
    async (data: OwnerFormData): Promise<Owner> => {
      const now = new Date().toISOString();
      const owner: Owner = {
        id: createOwnerId(),
        ...fromForm(data),
        createdAt: now,
        updatedAt: now,
      };
      await writeDoc(COLLECTIONS.owners, owner.id, owner);
      return owner;
    },
    [fromForm]
  );

  const updateOwner = useCallback(
    async (id: string, data: OwnerFormData): Promise<Owner | undefined> => {
      const existing = owners.find((o) => o.id === id);
      if (!existing) return undefined;
      const updated: Owner = {
        ...existing,
        ...fromForm(data),
        // createdAt is NOT touched: when the record was first written is
        // a fact about the record, and spreading `now` over both would
        // quietly erase it.
        updatedAt: new Date().toISOString(),
      };
      await writeDoc(COLLECTIONS.owners, id, updated);
      return updated;
    },
    [owners, fromForm]
  );

  /**
   * Record money paid to a plaza owner.
   *
   * RENT AND MAINTENANCE ALSO CREATE AN EXPENSE, and that is the whole
   * reason this lives in a context rather than in the form: entering it
   * here must be the ONLY entry, or the shop types it twice and Profit
   * & Loss counts it twice.
   *
   * Deposits and refunds create nothing. An advance is money the
   * landlord is holding, not money spent - expensing it would
   * understate profit now and overstate it on the day it comes back.
   *
   * The expense is dated by the MONTH IT COVERS, not the day it was
   * paid. April's rent settled on 3 May is an April cost; using the
   * payment date would move it into May and make both months wrong.
   */
  const recordPayment = useCallback(
    async (ownerId: string, data: OwnerPaymentFormData): Promise<OwnerPayment> => {
      const owner = owners.find((o) => o.id === ownerId);
      const amount = Math.round(Number(data.amount));
      const paidOn = new Date(`${data.paidOn}T12:00:00`).toISOString();

      let expenseId: string | undefined;
      if (isCostKind(data.kind)) {
        const label = OWNER_PAYMENT_LABELS[data.kind];
        const expense = await createExpense({
          title: `${label} - ${owner?.name ?? "plaza owner"}${data.periodMonth ? ` (${data.periodMonth})` : ""}`,
          category: expenseCategoryFor(data.kind),
          amount: String(amount),
          paymentMethod: "CASH",
          /**
           * Who paid it rides into the expense description too. The
           * Expense's own createdBy is the signed-in ACCOUNT, which the
           * two owners share - so without this the expense could not
           * say which of them actually handed the money over.
           */
          description: [data.paidBy ? `Paid by ${data.paidBy}` : "", data.notes.trim()]
            .filter(Boolean)
            .join(" - "),
          status: "PAID",
          // Midday for the same time-zone reason as a back-dated
          // purchase: a bare date read west of here lands a day early.
          expenseDate: data.periodMonth
            ? `${data.periodMonth}-15T12:00:00`
            : `${data.paidOn}T12:00:00`,
        });
        expenseId = expense.id;
      }

      const payment: OwnerPayment = {
        id: createOwnerPaymentId(),
        ownerId,
        ownerName: owner?.name ?? "",
        kind: data.kind,
        amount,
        paidOn,
        periodMonth: data.periodMonth,
        notes: data.notes.trim(),
        // Only stored when it is a name we know, like soldBy on a sale.
        ...((COUNTER_SELLERS as readonly string[]).includes(data.paidBy)
          ? { paidBy: data.paidBy }
          : {}),
        ...(expenseId ? { expenseId } : {}),
        createdAt: new Date().toISOString(),
      };

      await writeDoc(COLLECTIONS.ownerPayments, payment.id, payment);
      return payment;
    },
    [owners, createExpense]
  );

  const value = useMemo(
    () => ({
      owners,
      getOwner,
      createOwner,
      updateOwner,
      payments,
      getOwnerPayments,
      recordPayment,
      loading: state.loading || paymentsState.loading,
      error: state.error ?? paymentsState.error,
      isHydrated: !state.loading && !paymentsState.loading,
    }),
    [
      owners,
      getOwner,
      createOwner,
      updateOwner,
      payments,
      getOwnerPayments,
      recordPayment,
      state.loading,
      state.error,
      paymentsState.loading,
      paymentsState.error,
    ]
  );

  return <OwnersContext.Provider value={value}>{children}</OwnersContext.Provider>;
}

export function useOwners(): OwnersContextValue {
  const ctx = useContext(OwnersContext);
  if (!ctx) throw new Error("useOwners must be used inside OwnersProvider");
  return ctx;
}
