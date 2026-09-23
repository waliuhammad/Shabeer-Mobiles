import { WALK_IN_CUSTOMER_ID } from "@/types";
import type { Customer } from "@/types";

/**
 * THE shared mock customer source.
 *
 * ONE array, read by the admin customer screens, the POS customer
 * picker and the storefront account page. There is deliberately no
 * posCustomers / adminCustomers / checkoutCustomers.
 *
 * THESE CUSTOMERS ARE WIRED TO REAL RECORDS. Every name and phone here
 * matches an existing order in data/orders.ts or a counter sale in
 * data/admin.ts, so the purchase history and "total spent" figures on
 * the detail page are derived from actual transactions rather than
 * invented. cus_001 is also the person the storefront /account page
 * shows.
 *
 * All names, numbers and addresses are obviously fictional demo data.
 *
 * PHASE 2: becomes `customers/{customerId}` in Firestore, with a
 * Security Rule letting a signed-in customer read only their own record
 * and staff read all of them.
 */
export const mockCustomers: Customer[] = [
  {
    /**
     * The walk-in record. One row, reused for every anonymous counter
     * sale - see WALK_IN_CUSTOMER_ID in types/customer.ts for why this
     * is a single stable record rather than a row per sale.
     */
    id: WALK_IN_CUSTOMER_ID,
    name: "Walk-in Customer",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes:
      "System record for anonymous counter sales. Not a real person - do not edit or deactivate.",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Real customers are added through the admin panel or the POS.
];

/** Phase 2: getDoc(doc(db, "customers", id)). Same name, same return. */
export function getMockCustomer(id: string): Customer | undefined {
  return mockCustomers.find((c) => c.id === id);
}
