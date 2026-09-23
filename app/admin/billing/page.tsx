import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { POSTerminal } from "@/components/admin/billing/POSTerminal";

export const metadata: Metadata = { title: "POS / Billing" };

/**
 * /admin/billing - the shop counter.
 *
 * A Server Component shell around one client island. The till is
 * inherently interactive, so almost everything below POSTerminal runs in
 * the browser; the heading does not need to.
 *
 * It sits inside app/admin/layout.tsx, so it keeps the existing sidebar
 * and topbar - this is not a separate application. The "POS / Billing"
 * sidebar entry already pointed here since Step 1.
 *
 * FUTURE ROLE GATING: this is the one admin screen a CASHIER may open.
 * lib/admin-nav.ts already records that. Nothing is enforced yet.
 */
export default function BillingPage() {
  return (
    <>
      <AdminPageHeader
        title="POS / Billing"
        description="Ring up a counter sale and print an invoice."
      />
      <POSTerminal />
    </>
  );
}
