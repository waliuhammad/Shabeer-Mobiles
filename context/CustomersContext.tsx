"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mockCustomers } from "@/data/customers";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { WALK_IN_CUSTOMER_ID } from "@/types";
import type { Customer, CustomerFormData } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:customers:v1";

/**
 * The customer directory.
 *
 * ONE source, shared by the admin customer screens AND the POS picker.
 * A customer a cashier creates mid-sale appears in the admin list
 * immediately, because there is only one list.
 *
 * WHAT IS STORED: customers created or edited in this browser, layered
 * over the shared seed in data/customers.ts. An edited seed customer is
 * stored whole and shadows the seed by id, so changing one name does not
 * copy the other eight.
 *
 * KNOWN LIMITATION, same as every other mock store here: this lives in
 * one browser. Real customers belong in Firestore, where the counter and
 * the website genuinely see the same directory.
 */
interface CustomersContextValue {
  /** Everyone, including the walk-in system record. */
  customers: Customer[];
  /** Real people only - excludes the walk-in row. */
  people: Customer[];
  getCustomer: (id: string) => Customer | undefined;
  /** Active real people, for the POS picker. */
  selectableCustomers: Customer[];
  createCustomer: (data: CustomerFormData) => Customer;
  updateCustomer: (id: string, data: CustomerFormData) => Customer | undefined;
  /** Flips status. Never deletes - see types/customer.ts. */
  setCustomerStatus: (id: string, status: Customer["status"]) => void;
  resetCustomers: () => void;
  localChangeCount: number;
  isHydrated: boolean;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

function readStored(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is Customer =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Customer).id === "string" &&
        typeof (c as Customer).name === "string"
    );
  } catch {
    return [];
  }
}

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Customer[]>(readStored);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {
      // Storage blocked or full - still works for this session.
    }
  }, [local]);

  const customers = useMemo(() => {
    if (!isHydrated) return mockCustomers;

    // Seed rows, with any local edit shadowing them by id...
    const merged = mockCustomers.map(
      (seed) => local.find((l) => l.id === seed.id) ?? seed
    );
    // ...then anyone created in this browser.
    const brandNew = local.filter(
      (l) => !mockCustomers.some((m) => m.id === l.id)
    );

    return [...merged, ...brandNew];
  }, [local, isHydrated]);

  const people = useMemo(
    () => customers.filter((c) => c.id !== WALK_IN_CUSTOMER_ID),
    [customers]
  );

  /**
   * Who the POS may attach to a bill.
   *
   * Active only: an inactive customer is kept for their history but
   * should not be offered for new business. The walk-in record is
   * handled separately by the picker, as its own explicit choice.
   */
  const selectableCustomers = useMemo(
    () => people.filter((c) => c.status === "ACTIVE"),
    [people]
  );

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id),
    [customers]
  );

  const upsert = useCallback((customer: Customer) => {
    setLocal((current) => [
      ...current.filter((c) => c.id !== customer.id),
      customer,
    ]);
  }, []);

  const createCustomer = useCallback(
    (data: CustomerFormData): Customer => {
      const now = new Date().toISOString();
      const customer: Customer = {
        // "cus_" prefix keeps a customer id visibly different from an
        // order number or an invoice number at a glance.
        id: `cus_${Date.now().toString(36)}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      upsert(customer);
      return customer;
    },
    [upsert]
  );

  const updateCustomer = useCallback(
    (id: string, data: CustomerFormData): Customer | undefined => {
      const existing = getCustomer(id);
      if (!existing) return undefined;
      // The walk-in row is a system record, not a person.
      if (id === WALK_IN_CUSTOMER_ID) return undefined;

      const updated: Customer = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      upsert(updated);
      return updated;
    },
    [getCustomer, upsert]
  );

  const setCustomerStatus = useCallback(
    (id: string, status: Customer["status"]) => {
      const existing = getCustomer(id);
      if (!existing || id === WALK_IN_CUSTOMER_ID) return;
      upsert({ ...existing, status, updatedAt: new Date().toISOString() });
    },
    [getCustomer, upsert]
  );

  const resetCustomers = useCallback(() => setLocal([]), []);

  const value = useMemo(
    () => ({
      customers,
      people,
      getCustomer,
      selectableCustomers,
      createCustomer,
      updateCustomer,
      setCustomerStatus,
      resetCustomers,
      localChangeCount: isHydrated ? local.length : 0,
      isHydrated,
    }),
    [
      customers,
      people,
      getCustomer,
      selectableCustomers,
      createCustomer,
      updateCustomer,
      setCustomerStatus,
      resetCustomers,
      local.length,
      isHydrated,
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
