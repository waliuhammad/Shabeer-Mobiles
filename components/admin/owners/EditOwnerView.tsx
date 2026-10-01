"use client";

import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OwnerForm } from "@/components/admin/owners/OwnerForm";
import { useOwners } from "@/context/OwnersContext";

/**
 * Loads the person, then hands them to the SAME form the add page uses.
 *
 * A thin wrapper rather than a second form: create and edit differ only
 * in what they start with, so duplicating the fields and the validation
 * would guarantee they drift.
 */
export function EditOwnerView({ ownerId }: { ownerId: string }) {
  const { getOwner, isHydrated } = useOwners();
  const owner = getOwner(ownerId);

  // Before the subscription delivers, "missing" only means "not yet" -
  // 404-ing here would reject a record created moments ago.
  if (!owner) {
    if (!isHydrated) return null;
    notFound();
  }

  return (
    <>
      <AdminPageHeader title="Edit" description={`Update ${owner.name}.`} />
      <OwnerForm owner={owner} />
    </>
  );
}
