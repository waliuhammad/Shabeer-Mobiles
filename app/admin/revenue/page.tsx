import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RevenueView } from "@/components/admin/finance/RevenueView";

export const metadata: Metadata = { title: "Revenue" };

/** /admin/revenue */
export default function RevenuePage() {
  return (
    <>
      <AdminPageHeader
        title="Revenue"
        description="What the business took in, across both channels."
      />
      <RevenueView />
    </>
  );
}
