/**
 * Owner / stakeholder domain types.
 *
 * WHO THIS IS FOR, and why it is not the staff directory.
 *
 * The shop has two working owners who stand at the counter, and it
 * rents its premises from the people who own the plaza. Neither is
 * "staff": staff is about who may sign in and what they may do, which
 * is a Firebase custom claim and lives nowhere near this. This is a
 * record of the people with a stake in the business and the building -
 * who they are, how to reach them, and what share they hold.
 *
 * It grants NOTHING. Adding somebody here does not give them a login,
 * and removing them does not take one away. That separation is
 * deliberate: a contact record that silently carried access would be a
 * way to grant access without anyone realising they had.
 */

/**
 * What this person is to the business.
 *
 * A short fixed list rather than free text, so the page can be grouped
 * and filtered by it later. "Other" exists so an unusual arrangement -
 * a silent investor, a family member with a claim - can still be
 * written down rather than squeezed into the wrong label.
 */
export const OWNER_ROLES = [
  "Shop Owner",
  "Partner",
  "Plaza Owner",
  "Landlord",
  "Investor",
  "Other",
] as const;

export type OwnerRole = (typeof OWNER_ROLES)[number];

/**
 * INACTIVE IS NOT DELETION, for the same reason it is not on suppliers:
 * a former partner is part of the shop's history, and the agreements
 * that mention them do not stop existing when the arrangement ends.
 */
export type OwnerStatus = "active" | "inactive";

export interface Owner {
  /** Internal id. Becomes a Firestore document id. */
  id: string;
  name: string;
  role: OwnerRole;
  phone: string;
  email: string;
  address: string;
  /**
   * Share of the business or the property, as a percentage.
   *
   * A STRING-FREE number, and optional: plenty of real arrangements
   * have no agreed percentage at all - a landlord owns the building
   * outright and holds no share of the shop. Storing 0 for "not
   * applicable" would make the totals below lie, so absent means
   * absent.
   */
  sharePercent: number | null;
  notes: string;
  status: OwnerStatus;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** What the add/edit form collects. No id, no timestamps. */
export interface OwnerFormData {
  name: string;
  role: OwnerRole;
  phone: string;
  email: string;
  address: string;
  /** Raw input, so an empty box and a typed 0 stay distinguishable. */
  sharePercent: string;
  notes: string;
  status: OwnerStatus;
}

export type OwnerErrors = Partial<Record<keyof OwnerFormData, string>>;
