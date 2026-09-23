"use client";

import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SupplierForm } from "@/components/admin/suppliers/SupplierForm";
import { usePurchasing } from "@/context/PurchasingContext";

/**
 * Loads the supplier, then hands it to the SAME form the add page uses.
 *
 * A thin wrapper rather than a second form: create and edit differ only
 * in what they start with, so duplicating the fields and validation
 * would guarantee they drift.
 */
export function EditSupplierView({ supplierId }: { supplierId: string }) {
  const { getSupplier, isHydrated } = usePurchasing();
  const supplier = getSupplier(supplierId);

  // Before hydration the context holds only the seed, so wait rather
  // than 404-ing a supplier created in this browser.
  if (!supplier) {
    if (!isHydrated) return null;
    notFound();
  }

  return (
    <>
      <AdminPageHeader
        title="Edit Supplier"
        description={`Update ${supplier.name}.`}
      />
      <SupplierForm supplier={supplier} />
    </>
  );
}
