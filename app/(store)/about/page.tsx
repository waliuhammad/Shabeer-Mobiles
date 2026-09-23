import { notFound } from "next/navigation";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Wrench,
  PackageCheck,
  Headset,
  Store,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ServicesSection } from "@/components/home/ServicesSection";
import { VisitShop } from "@/components/home/VisitShop";
import { Button } from "@/components/ui/button";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `${BUSINESS.name} - ${BUSINESS.tagline}. Used mobiles, genuine accessories and expert repairing in Multan.`,
};

/**
 * Everything here is either verifiable from the business card or a plain
 * description of what the shop does.
 *
 * Deliberately ABSENT: years in business, number of customers served,
 * certifications, awards and ratings. None of that was supplied, and
 * inventing it would be a lie printed on the shop's own website - the kind
 * a real customer can walk in and disprove.
 */
const WHY_CHOOSE_US = [
  {
    Icon: PackageCheck,
    title: "Quality Products",
    description:
      "Every used phone is checked before it reaches the shelf, and accessories are tested rather than sold blind.",
  },
  {
    Icon: Wrench,
    title: "Professional Repairing",
    description:
      "An in-house repairing lab for screens, charging ports, batteries and board-level faults.",
  },
  {
    Icon: ShieldCheck,
    title: "Genuine Accessories",
    description:
      "Original chargers and accessories stocked alongside tested budget options, clearly labelled as such.",
  },
  {
    Icon: Headset,
    title: "Customer Support",
    description:
      "Call or message on WhatsApp and speak to the shop directly - no call centre in between.",
  },
  {
    Icon: Store,
    title: "A Real Physical Shop",
    description:
      "We are not an online-only seller. Walk in, see the product, and collect your online order in person.",
  },
];

/**
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_STORE_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default function AboutPage() {
  if (!ONLINE_STORE_ENABLED) notFound();

  return (
    <>
      <Container className="py-6 lg:py-10">
        <Breadcrumb
          className="mb-6"
          items={[{ label: "Home", href: "/" }, { label: "About" }]}
        />

        {/* ---------------- INTRO ---------------- */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            About Us
          </p>
          <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
            SHABBIR MOBILES
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-secondary">
            {BUSINESS.tagline}
          </p>

          <div className="mt-6 space-y-4 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Shabbir Mobiles is a mobile phone and accessories shop in Multan,
              with a repairing lab on the same counter. We sell tested
              second-hand phones, genuine chargers and everyday accessories -
              and we fix the phone you already own.
            </p>
            <p>
              The shop is at {FULL_ADDRESS}. Everything listed on this website
              is stock you can walk in and look at, which is the part most
              online sellers cannot offer. Order online for delivery across the
              city, or reserve an item and collect it from the counter.
            </p>
            <p>
              Whether you need a screen replaced, a battery that lasts the day,
              a phone flashed, or just the right charger for your model, it is
              handled in one place by the people who will still be here next
              week.
            </p>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <Link href="/shop">
                Browse Products
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 font-semibold">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </Container>

      {/* Reused verbatim from the homepage - one definition of what we do. */}
      <ServicesSection />

      {/* ---------------- WHY CHOOSE US ---------------- */}
      <section className="bg-muted/50 py-12 lg:py-16">
        <Container>
          <SectionHeading
            eyebrow="Why Choose Us"
            title="What You Get at the Counter"
            description="Plain commitments, not marketing claims."
            align="center"
          />

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE_US.map(({ Icon, title, description }) => (
              <li
                key={title}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-cyan-soft text-secondary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Reused from the homepage - address, hours, map and directions. */}
      <VisitShop />
    </>
  );
}
