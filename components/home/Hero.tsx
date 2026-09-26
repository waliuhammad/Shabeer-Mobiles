import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, ShieldCheck, Wrench, Truck, Store } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";

/**
 * Delivery is something an ONLINE ORDER gets. With ordering off, the
 * site offers no way to ask for it and records no address, so the claim
 * comes out and the shop's actual promise goes in. The product pages say
 * the same thing, from the same flag, so the two cannot disagree.
 */
const TRUST_POINTS = [
  { Icon: ShieldCheck, label: "Genuine Products" },
  { Icon: Wrench, label: "Expert Repairing" },
  ONLINE_ORDERING_ENABLED
    ? { Icon: Truck, label: "City-wide Delivery" }
    : { Icon: Store, label: "Buy at the Counter" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* Decorative glows. aria-hidden so screen readers ignore them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-secondary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-accent/10 blur-3xl"
      />

      <Container className="relative grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">
        {/* --- Copy --- */}
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Trusted mobile shop in Multan
          </p>

          <h1 className="text-3xl font-bold leading-[1.15] sm:text-4xl lg:text-5xl">
            Everything Your <span className="text-accent">Phone</span> Needs
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
            Used mobiles, original chargers, covers, protectors, handsfree, AirPods
            and power banks - plus expert repairing, battery replacement and
            software solutions, all under one roof.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-11 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
            >
              <Link href="/shop">
                Shop Now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-11 border-white/25 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/#visit">
                <MapPin className="size-4" aria-hidden="true" />
                Visit Our Shop
              </Link>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST_POINTS.map(({ Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs text-white/70 sm:text-sm"
              >
                <Icon className="size-4 text-secondary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* --- Product visual --- */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          {/* A soft glow behind the cluster so it lifts off the navy instead
              of sitting flat on it. Decorative, so hidden from screen readers. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/15 blur-3xl"
          />

          {/*
            A PHOTOGRAPHIC SCENE, not a cut-out, so it is NOT run through
            scripts/cutout-hero.mjs. That tool removes a studio backdrop
            by flooding inward from the border; this picture's backdrop
            is a room - a wall, a plant, a marble counter - and there is
            nothing to flood. It is resized and compressed, and given
            rounded corners so a rectangular photo sits deliberately on
            the navy rather than looking like it was dropped there.

            The filename still carries a content hash. Next.js and
            Vercel cache an optimised image against its URL, never its
            bytes, so replacing a hero in place serves the previous
            picture - which happened, and took a screenshot to notice.
          */}
          <Image
            src="/images/hero-devices-084fb50c.jpg"
            alt="Phone cases, chargers, cables, power banks, earbuds, headphones, a smartwatch and a memory card on a counter"
            width={1280}
            height={853}
            priority
            sizes="(max-width: 1024px) 90vw, 46vw"
            className="relative mx-auto h-auto w-full rounded-2xl drop-shadow-2xl"
          />

        </div>
      </Container>
    </section>
  );
}
