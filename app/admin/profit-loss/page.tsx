import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProfitLossView } from "@/components/admin/finance/ProfitLossView";

export const metadata: Metadata = { title: "Profit & Loss" };

/**
 * /admin/profit-loss
 *
 * Owner-only in intent - it exposes purchase costs and margins. See the
 * note in ProfitLossView about why hiding a nav link is not security.
 */
export default function ProfitLossPage() {
  return (
    <>
      <AdminPageHeader
        title="Profit & Loss"
        description="What the business actually kept after costs."
      />
      <ProfitLossView />
    </>
  );
}
