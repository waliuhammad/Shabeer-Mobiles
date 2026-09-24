import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MessagesView } from "@/components/admin/messages/MessagesView";

export const metadata: Metadata = { title: "Messages" };

/** /admin/messages - enquiries sent from the public contact form. */
export default function MessagesPage() {
  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Enquiries sent from the Contact page on the website."
      />
      <MessagesView />
    </>
  );
}
