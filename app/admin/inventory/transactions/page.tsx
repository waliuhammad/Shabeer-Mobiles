import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TransactionLedgerView } from "@/components/admin/inventory/TransactionLedgerView";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Inventory Transactions" };

/**
 * /admin/inventory/transactions
 *
 * NOTE ON ROUTING: this sits alongside the dynamic [productId] segment.
 * Next.js matches STATIC segments before dynamic ones, so /transactions
 * resolves here and never reaches [productId]. The only thing to avoid is
 * ever creating a product whose id is literally "transactions".
 */
export default function InventoryTransactionsPage() {
  return (
    <>
      <Button asChild variant="outline" size="sm" className="mb-4 h-9 gap-1.5 text-xs">
        <Link href="/admin/inventory">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Inventory
        </Link>
      </Button>

      <AdminPageHeader
        title="Inventory Transactions"
        description="Every recorded stock movement, and what caused it."
      />
      <TransactionLedgerView />
    </>
  );
}
