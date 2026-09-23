import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReportsView } from "@/components/admin/reports/ReportsView";

export const metadata: Metadata = { title: "Reports" };

/** /admin/reports */
export default function ReportsPage() {
  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="Export the numbers your accountant asks for."
      />
      <ReportsView />
    </>
  );
}
