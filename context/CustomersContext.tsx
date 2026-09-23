"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc } from "@/lib/firebase/write";
import { useAuth } from "@/context/AuthContext";
import { WALK_IN_CUSTOMER_ID } from "@/types";
import type { Customer, CustomerFormData } from "@/types";

/**
 * The customer directory - live Firestore.
 *
 * ONE source, shared by the admin customer screens AND the POS picker.
 * A customer a cashier creates mid-sale now appears on the owner's
 * laptop immediately, because both are watching the same collection
 * rather than two separate browser caches.
 *
 * THE WALK-IN RECORD IS SYNTHETIC. It is not stored in Firestore: it is
 * a stable placeholder the POS attaches anonymous counter sales to.
 * Writing it to the database would invite someone to edit or deactivate
 * it, and every past invoice pointing at it would lose its meaning. It
 * is prepended in memory instead.
 */

const WALK_IN: Customer = {
  id: WALK_IN_CUSTOMER_ID,
  name: "Walk-in Customer",
  phone: "",
  email: "",
  address: "",
  city: "",
  notes: "System record for anonymous counter sales. Not a real person.",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

interface CustomersContextValue {
  customers: Customer[];
  people: Customer[];
  getCustomer: (id: string) => Customer | undefined;
  selectableCustomers: Customer[];
  createCustomer: (data: CustomerFormData) => Promise<Customer>;
  updateCustomer: (id: string, data: CustomerFormData) => Promise<Customer | undefined>;
  setCustomerStatus: (id: string, status: Customer["status"]) => Promise<void>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

function mapCustomer(doc: QueryDocumentSnapshot): Customer | null {
  const d = doc.data();
  if (typeof d.name !== "string") return null;
  return {
    id: doc.id,
    name: d.name,
    phone: typeof d.phone === "string" ? d.phone : "",
    email: typeof d.email === "string" ? d.email : "",
    address: typeof d.address === "string" ? d.address : "",
    city: typeof d.city === "string" ? d.city : "",
    notes: typeof d.notes === "string" ? d.notes : "",
    status: d.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
  };
}

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Customer records are personal data: firestore.rules allows a read
  // only to staff, or to the customer themselves. Do not open a
  // listener that is certain to be refused.
  const enabled = !authLoading && Boolean(user?.isStaff);

  const state = useFirestoreCollection<Customer>(COLLECTIONS.customers, mapCustomer, {
    enabled,
  });

  const people = state.items;

  const customers = useMemo(() => [WALK_IN, ...people], [people]);

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id),
    [customers]
  );

  /**
   * Who the POS may attach to a bill. Active only - an inactive customer
   * keeps their history but is not offered for new business. Walk-in is
   * offered separately by the picker as its own explicit choice.
   */
  const selectableCustomers = useMemo(
    () => people.filter((c) => c.status === "ACTIVE"),
    [people]
  );

  const createCustomer = useCallback(async (data: CustomerFormData): Promise<Customer> => {
    const stamp = new Date().toISOString();
    const customer: Customer = {
      // "cus_" keeps a customer id visibly different from an order or
      // invoice number at a glance.
      id: `cus_${Date.now().toString(36)}`,
      ...data,
      createdAt: stamp,
      updatedAt: stamp,
    };
    await writeDoc(COLLECTIONS.customers, customer.id, customer);
    return customer;
  }, []);

  const updateCustomer = useCallback(
    async (id: string, data: CustomerFormData): Promise<Customer | undefined> => {
      const existing = getCustomer(id);
      if (!existing) return undefined;
      // The walk-in row is synthetic - there is nothing to update.
      if (id === WALK_IN_CUSTOMER_ID) return undefined;

      const updated: Customer = { ...existing, ...data, updatedAt: new Date().toISOString() };
      await writeDoc(COLLECTIONS.customers, id, updated);
      return updated;
    },
    [getCustomer]
  );

  const setCustomerStatus = useCallback(
    async (id: string, status: Customer["status"]) => {
      if (id === WALK_IN_CUSTOMER_ID) return;
      // Deactivate, never delete - their orders record who bought what.
      await writeDoc(COLLECTIONS.customers, id, {
        status,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      customers,
      people,
      getCustomer,
      selectableCustomers,
      createCustomer,
      updateCustomer,
      setCustomerStatus,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [
      customers, people, getCustomer, selectableCustomers, createCustomer,
      updateCustomer, setCustomerStatus, state.loading, state.error,
    ]
  );

  return (
    <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>
  );
}

export function useCustomers(): CustomersContextValue {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error("useCustomers must be used inside a <CustomersProvider>");
  }
  return context;
}
