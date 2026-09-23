import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsView } from "@/components/admin/settings/SettingsView";

export const metadata: Metadata = { title: "Settings" };

/** /admin/settings */
export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Shop details, tax, delivery charges and receipts."
      />
      <SettingsView />
    </>
  );
}
