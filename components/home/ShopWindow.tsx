import { Phone, MessageCircle, Mail, MapPin, Clock, Smartphone } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ServicesSection } from "@/components/home/ServicesSection";
import { VisitShop } from "@/components/home/VisitShop";
import { Button } from "@/components/ui/button";
import { BUSINESS, FULL_ADDRESS, WHATSAPP_URL } from "@/lib/constants";

/**
 * The public front page, for a shop that does NOT sell online.
 *
 * WHAT IT IS FOR
 * --------------
 * Someone searches for the shop, finds this address, and wants three
 * things: where it is, when it is open, and how to get in touch. That is
 * the whole job.
 *
 * WHAT IT DELIBERATELY OMITS: products, prices, a cart, an "order now".
 * Promising any of those would be a lie - the business sells at the
 * counter. A page that lists stock a customer cannot buy generates
 * phone calls that begin with a misunderstanding.
 *
 * The full storefront still exists behind ONLINE_STORE_ENABLED. If the
 * shop ever sells online, that flag brings back the version of this page
 * with products on it.
 */
export function ShopWindow() {
  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="border-b border-border bg-primary">
        <Container className="py-14 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
              <Smartphone className="size-3.5" aria-hidden="true" />
              {BUSINESS.tagline}
            </span>

            <h1 className="mt-4 font-heading text-3xl font-bold text-background sm:text-4xl lg:text-5xl">
              {BUSINESS.name}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-background/80">
              {BUSINESS.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-11 gap-2 bg-accent px-5 font-semibold text-accent-foreground hover:bg-gold-deep"
              >
                <a href={`tel:${BUSINESS.phone}`}>
                  <Phone className="size-4" aria-hidden="true" />
                  Call {BUSINESS.phoneDisplay}
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 gap-2 border-background/30 bg-transparent px-5 font-semibold text-background hover:bg-background/10"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- AT A GLANCE ---------------- */}
      <Container as="section" className="py-12 lg:py-16">
        <SectionHeading
          eyebrow="Find us"
          title="Visit the shop"
          description="We sell, service and repair at the counter - come in, call or message."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard Icon={MapPin} title="Address">
            {FULL_ADDRESS}
          </InfoCard>

          <InfoCard Icon={Clock} title="Opening hours">
            {BUSINESS.hours.map((h) => (
              <span key={h.days} className="block">
                {h.days}
                <span className="block font-medium text-foreground">{h.time}</span>
              </span>
            ))}
          </InfoCard>

          <InfoCard Icon={Phone} title="Contact">
            <a
              href={`tel:${BUSINESS.phone}`}
              className="block font-medium text-foreground hover:text-secondary"
            >
              {BUSINESS.phoneDisplay}
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-secondary"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${BUSINESS.email}`}
              className="flex items-center gap-1.5 break-all hover:text-secondary"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              {BUSINESS.email}
            </a>
          </InfoCard>
        </div>
      </Container>

      {/* What the shop actually does. */}
      <ServicesSection />

      {/* Map, address and directions - already built, already correct. */}
      <VisitShop />

      {/* ---------------- HONEST FOOTNOTE ---------------- */}
      <Container as="section" className="pb-12">
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          We do not sell online. Everything is bought and collected at the shop -
          call or message to check whether something is in stock before you travel.
        </p>
      </Container>
    </>
  );
}

function InfoCard({
  Icon,
  title,
  children,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="size-4 text-secondary" aria-hidden />
        {title}
      </p>
      <div className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
