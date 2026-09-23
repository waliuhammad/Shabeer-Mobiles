"use client";

import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";
import { useCustomers } from "@/context/CustomersContext";
import { isSystemCustomer } from "@/lib/customer-utils";

/**
 * Loads the customer, then hands it to the SAME form the add page uses.
 *
 * A thin wrapper rather than a second form - create and edit differ only
 * in what they start with.
 */
export function EditCustomerView({ customerId }: { customerId: string }) {
  const { getCustomer, isHydrated } = useCustomers();
  const customer = getCustomer(customerId);

  // Wait for hydration before 404-ing: a customer created in this
  // browser (or from the POS) does not exist in the server seed.
  if (!customer) {
    if (!isHydrated) return null;
    notFound();
  }

  // The walk-in row is a system record, not a person.
  if (isSystemCustomer(customer)) notFound();

  // HYDRATION GATE - load-bearing, not a loading spinner.
  //
  // Before hydration the store holds only the seed, so a record that has
  // been edited in this browser still reads with its ORIGINAL values. The
  // form seeds its useState from what it is handed on first render, so
  // mounting it now would freeze those stale values into the form and
  // quietly discard the saved edit on the next save.
  //
  // Waiting one paint means the form always mounts with the real record.
  if (!isHydrated) return null;

  return (
    <>
      <AdminPageHeader
        title="Edit Customer"
        description={`Update ${customer.name}.`}
      />
      <CustomerForm customer={customer} />
    </>
  );
}
