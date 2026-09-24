"use client";

import { useMemo, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MessageCircle,
  Inbox,
  Check,
  Archive,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { patchDoc } from "@/lib/firebase/write";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { formatOrderDateTime } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import type { ContactMessage, MessageStatus } from "@/types/message";

/**
 * /admin/messages - enquiries from the public contact form.
 *
 * These used to be thrown away. The form validated its fields, showed
 * "your message has been received" and did nothing else, so every
 * enquiry a customer typed was lost. They now arrive in Firestore via
 * app/api/contact/route.ts and are listed here.
 *
 * Live, like the rest of the panel: onSnapshot, so a message sent while
 * this page is open appears without a refresh.
 *
 * REPLYING HAPPENS OUTSIDE THIS SCREEN, on purpose. The shop answers by
 * phone or WhatsApp, so each message carries buttons that open those
 * directly, with the customer's number already filled in. Building an
 * in-app reply box would mean an email provider, a sending identity and
 * a deliverability problem, to produce something slower than the phone
 * call the shop was going to make anyway.
 */

function mapMessage(doc: QueryDocumentSnapshot): ContactMessage | null {
  const d = doc.data();
  if (typeof d.name !== "string" || typeof d.message !== "string") return null;

  const status: MessageStatus =
    d.status === "READ" || d.status === "ARCHIVED" ? d.status : "NEW";

  return {
    id: doc.id,
    name: d.name,
    email: typeof d.email === "string" ? d.email : "",
    phone: typeof d.phone === "string" ? d.phone : "",
    subject: typeof d.subject === "string" ? d.subject : "(no subject)",
    message: d.message,
    status,
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
  };
}

const TABS: { value: MessageStatus | "ALL"; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "READ", label: "Read" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ALL", label: "All" },
];

export function MessagesView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<MessageStatus | "ALL">("NEW");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { items, loading, error } = useFirestoreCollection<ContactMessage>(
    COLLECTIONS.messages,
    mapMessage,
    { enabled: Boolean(user?.isStaff) }
  );

  /* Newest first - an enquiry from an hour ago matters more than one
     from last month, and the list is read top-down. */
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  const visible = useMemo(
    () => (tab === "ALL" ? sorted : sorted.filter((m) => m.status === tab)),
    [sorted, tab]
  );

  const newCount = useMemo(
    () => items.filter((m) => m.status === "NEW").length,
    [items]
  );

  async function setStatus(id: string, status: MessageStatus) {
    setBusyId(id);
    try {
      await patchDoc(COLLECTIONS.messages, id, { status });
      toast.success(status === "ARCHIVED" ? "Message archived." : "Marked as read.");
    } catch {
      toast.error("Your role does not allow that change.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        Could not read messages. {error}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {t.label}
            {t.value === "NEW" && newCount > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white tabular-nums">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading messages...</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {tab === "NEW" ? "No new enquiries" : "Nothing here"}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Messages sent from the Contact page on the website arrive here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((m) => (
            <li
              key={m.id}
              className={cn(
                "rounded-xl border bg-card p-4",
                m.status === "NEW" ? "border-secondary/40" : "border-border"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {m.subject}
                    {m.status === "NEW" && (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.name} · {formatOrderDateTime(m.createdAt)}
                  </p>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {m.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {m.phone && (
                  <>
                    <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
                      <a href={`tel:${m.phone}`}>
                        <Phone className="size-3.5" aria-hidden="true" />
                        {m.phone}
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
                      {/* Strip everything but digits and assume a local
                          Pakistani number, which is what the form asks
                          for: 03xx... becomes 923xx... for wa.me. */}
                      <a
                        href={`https://wa.me/92${m.phone.replace(/\D/g, "").replace(/^0+/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="size-3.5" aria-hidden="true" />
                        WhatsApp
                      </a>
                    </Button>
                  </>
                )}
                {m.email && (
                  <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
                    <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>
                      <Mail className="size-3.5" aria-hidden="true" />
                      Email
                    </a>
                  </Button>
                )}

                {m.status !== "READ" && m.status !== "ARCHIVED" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId === m.id}
                    onClick={() => setStatus(m.id, "READ")}
                    className="h-9 gap-1.5 text-xs"
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Mark read
                  </Button>
                )}
                {m.status !== "ARCHIVED" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId === m.id}
                    onClick={() => setStatus(m.id, "ARCHIVED")}
                    className="h-9 gap-1.5 text-xs"
                  >
                    <Archive className="size-3.5" aria-hidden="true" />
                    Archive
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Messages are never deleted, only archived - an enquiry somebody can
        quietly erase is a complaint nobody can prove was made. They arrive
        through a server route, so nothing on the public internet can write
        into this collection directly.
      </p>
    </div>
  );
}
