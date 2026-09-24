import type { Metadata } from "next";
import { Phone, MessageCircle, MapPin, Clock, Mail } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ContactForm } from "@/components/contact/ContactForm";
import { VisitShop } from "@/components/home/VisitShop";
import { BUSINESS, WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Call, WhatsApp or visit ${BUSINESS.name} at ${BUSINESS.address.plaza}, ${BUSINESS.address.street}, ${BUSINESS.address.city}.`,
};

/**
 * /contact
 *
 * ON THE EMAIL ADDRESS: a real, monitored inbox is now set in
 * lib/constants.ts, so the email row is shown. The flag stays because
 * the reasoning behind it still holds - publishing an address nobody
 * reads is worse than publishing none, because customers write to it and
 * hear nothing back. If the shop ever changes address and the new one is
 * not being watched yet, set this to false rather than shipping a dead
 * mailbox.
 */
const HAS_CONFIRMED_EMAIL = true;

export default function ContactPage() {

  return (
    <>
      <Container className="py-6 lg:py-10">
        <Breadcrumb
          className="mb-6"
          items={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        />

        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Contact Us</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Call, message on WhatsApp, or walk into the shop. We answer during
            opening hours.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-start lg:gap-8">
          {/* ---------------- SHOP DETAILS ---------------- */}
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-heading text-lg font-bold text-primary">
                {BUSINESS.name}
              </h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-secondary">
                {BUSINESS.tagline}
              </p>

              <address className="mt-5 space-y-4 not-italic">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Shop Address</p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      {BUSINESS.address.shop}
                      <br />
                      {BUSINESS.address.plaza}
                      <br />
                      {BUSINESS.address.street}
                      <br />
                      {BUSINESS.address.city}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Phone</p>
                    <a
                      href={`tel:${BUSINESS.phone}`}
                      className="mt-0.5 block text-muted-foreground transition-colors hover:text-secondary"
                    >
                      {BUSINESS.phoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MessageCircle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">WhatsApp</p>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-muted-foreground transition-colors hover:text-secondary"
                    >
                      Message the shop
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Email</p>
                    {HAS_CONFIRMED_EMAIL ? (
                      <a
                        href={`mailto:${BUSINESS.email}`}
                        className="mt-0.5 block text-muted-foreground transition-colors hover:text-secondary"
                      >
                        {BUSINESS.email}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-muted-foreground">Coming soon</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Opening Hours</p>
                    <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
                      {BUSINESS.hours.map((h) => (
                        <li key={h.days}>
                          <span className="font-medium">{h.days}:</span> {h.time}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Hours to be confirmed with the shop.
                    </p>
                  </div>
                </div>
              </address>
            </section>
          </div>

          {/* ---------------- FORM ---------------- */}
          <ContactForm />
        </div>
      </Container>

      {/* Reused from the homepage - map, directions and opening hours. */}
      <VisitShop />
    </>
  );
}
