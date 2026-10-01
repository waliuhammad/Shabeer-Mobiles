"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { writeDoc } from "@/lib/firebase/write";
import {
  createOwnerId,
  isOwnerRole,
  parseSharePercent,
} from "@/lib/owner-utils";
import type { Owner, OwnerFormData } from "@/types";

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
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const OwnersContext = createContext<OwnersContextValue | null>(null);

export function OwnersProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const enabled = !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";

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

  const value = useMemo(
    () => ({
      owners,
      getOwner,
      createOwner,
      updateOwner,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [owners, getOwner, createOwner, updateOwner, state.loading, state.error]
  );

  return <OwnersContext.Provider value={value}>{children}</OwnersContext.Provider>;
}

export function useOwners(): OwnersContextValue {
  const ctx = useContext(OwnersContext);
  if (!ctx) throw new Error("useOwners must be used inside OwnersProvider");
  return ctx;
}
