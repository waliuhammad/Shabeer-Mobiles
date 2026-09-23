import type { Metadata } from "next";
import Link from "next/link";
import { FileClock } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InventoryView } from "@/components/admin/inventory/InventoryView";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Inventory" };

/**
 * /admin/inventory
 *
 * A Server Component shell around one client island. The live stock
 * figures depend on locally recorded movements, which only the browser
 * knows about, so the working parts are client-side.
 */
export default function InventoryPage() {
  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="Track stock levels, movements, and inventory activity."
        actions={
          <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm font-medium">
            <Link href="/admin/inventory/transactions">
              <FileClock className="size-4" aria-hidden="true" />
              Transaction Ledger
            </Link>
          </Button>
        }
      />
      <InventoryView />
    </>
  );
}
