import { MapPin, Clock, Phone, Navigation, MessageCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ShopMap } from "@/components/shared/ShopMap";
import { Button } from "@/components/ui/button";
import { BUSINESS, DIRECTIONS_URL, WHATSAPP_URL } from "@/lib/constants";

export function VisitShop() {
  return (
    <section id="visit" className="scroll-mt-28 bg-muted/50 py-12 lg:py-16">
      <Container>
        <SectionHeading
          eyebrow="Find Us"
          title="Visit Our Shop"
          description="Walk in for repairs, bring your phone for a free checkup, or pick up your online order."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Details */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h3 className="font-heading text-xl font-bold text-primary">{BUSINESS.name}</h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-secondary">
              {BUSINESS.tagline}
            </p>

            <address className="mt-6 space-y-5 not-italic">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Address</p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">
                    {BUSINESS.address.shop}
                    <br />
                    {BUSINESS.address.plaza}
                    <br />
                    {BUSINESS.address.street}, {BUSINESS.address.city}
                  </p>
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
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Call Us</p>
                  <a
                    href={`tel:${BUSINESS.phone}`}
                    className="mt-0.5 block text-muted-foreground hover:text-secondary"
                  >
                    {BUSINESS.phoneDisplay}
                  </a>
                </div>
              </div>
            </address>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 bg-primary px-5 font-semibold hover:bg-navy-soft">
                <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
                  <Navigation className="size-4" aria-hidden="true" />
                  Get Directions
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5 font-semibold">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp Us
                </a>
              </Button>
            </div>
          </div>

          {/* The live map. Reads its location from lib/constants.ts - the
              same source the Get Directions button above uses, so the two
              can never point at different places. */}
          <ShopMap className="min-h-[320px]" />
        </div>
      </Container>
    </section>
  );
}
