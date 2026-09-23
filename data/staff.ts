import type { AdminRole } from "@/lib/admin-nav";

/**
 * Staff accounts - A PLANNING TOOL, NOT AUTHENTICATION.
 *
 * Nothing in this file signs anyone in, checks a password, or restricts
 * a single route. It lets the owner write down who works at the shop and
 * what each person should be allowed to do, so that when Firebase Auth
 * arrives the roles already exist and the mapping is obvious.
 *
 * Treating this as security would be a serious mistake, which is why the
 * page says so in plain language rather than in a comment only a
 * developer would read.
 *
 * PHASE 2: each row becomes a Firebase Auth user plus a custom claim
 * carrying the role. Firestore Security Rules then read that claim, and
 * a cashier physically cannot fetch a purchase price no matter what the
 * UI does.
 */
export type StaffStatus = "ACTIVE" | "DISABLED";

export interface StaffMember {
  id: string;
  name: string;
  /** The address that will become their sign-in identity in Phase 2. */
  email: string;
  phone: string;
  role: AdminRole;
  status: StaffStatus;
  /** Free text: "Counter", "Repairs desk". */
  note: string;
  createdAt: string;
  updatedAt: string;
}

export const seedStaff: StaffMember[] = [
  // Cleared. Real records are entered through the admin panel.
];

/** All fictional demo people. Replace before anyone relies on this. */
export function getSeedStaff(id: string): StaffMember | undefined {
  return seedStaff.find((s) => s.id === id);
}
