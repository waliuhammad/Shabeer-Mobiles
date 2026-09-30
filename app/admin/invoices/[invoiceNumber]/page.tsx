import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InvoiceDetailView } from "@/components/admin/billing/InvoiceDetailView";

export async function generateMetadata({
  params,
}: PageProps<"/admin/invoices/[invoiceNumber]">): Promise<Metadata> {
  const { invoiceNumber } = await params;
  return { title: `Invoice ${invoiceNumber}` };
}

/**
 * /admin/invoices/[invoiceNumber]
 *
 * THE PARAM IS THE INVOICE NUMBER, not the document id - "SM-INV-0001",
 * the reference printed on the customer's receipt. It matches how
 * /admin/orders/[id] keys on the order number, and it is what somebody
 * holding a printed receipt can actually type.
 *
 * No data is fetched here. The view reads InvoicesContext, which the
 * panel already subscribes to, so opening an invoice costs no extra
 * Firestore read.
 */
export default async function InvoicePage({
  params,
}: PageProps<"/admin/invoices/[invoiceNumber]">) {
  const { invoiceNumber } = await params;

  return (
    <>
      <AdminPageHeader
        title="Invoice"
        description="A counter sale, as it was rung up."
      />
      <InvoiceDetailView invoiceNumber={decodeURIComponent(invoiceNumber)} />
    </>
  );
}
