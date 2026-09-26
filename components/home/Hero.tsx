import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, ShieldCheck, Wrench, Truck, Store } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { LiveStockCount } from "@/components/home/LiveStockCount";

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

interface HeroProps {
  /**
   * How many units are actually on the shelf, summed from Firestore by
   * the page above.
   *
   * IT USED TO SAY "500+", HARDCODED. The shop has eleven products and
   * a couple of hundred units, and the Shop button sits directly under
   * the claim - a customer can click it and count. A shop's own website
   * is the worst possible place to be caught rounding up.
   *
   * Optional, so the storefront can render this component without a
   * count; the tile is then left out rather than guessing.
   */
  unitsInStock?: number;
}

export function Hero({ unitsInStock }: HeroProps) {
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
            The source was a JPEG on a white background. It has been cropped
            to its content and had the background knocked out, so the
            products sit directly on the navy with no white box.

            `priority` because this is the Largest Contentful Paint element -
            it must not be lazy-loaded.
            `sizes` tells the browser how wide it actually renders, so a
            phone downloads a phone-sized file.
          */}
          <Image
            src="/images/hero-products.png"
            alt="Smartphones, smartwatch, wireless earbuds, power bank, Bluetooth speaker and headphones available at Shabbir Mobiles"
            width={647}
            height={437}
            priority
            sizes="(max-width: 1024px) 90vw, 46vw"
            className="relative mx-auto h-auto w-full drop-shadow-2xl"
          />

          {/*
            Server-rendered first, then kept live.

            Hero receives the count from the page, which reads Firestore
            on the server - so the figure is in the HTML for a crawler
            and for a visitor whose JavaScript has not arrived.
            LiveStockCount then subscribes and keeps it current, because
            the page itself is cached for a minute and a stock figure is
            the one number on here somebody might act on immediately.
          */}
          {typeof unitsInStock === "number" && unitsInStock > 0 && (
            <LiveStockCount initial={unitsInStock} />
          )}
        </div>
      </Container>
    </section>
  );
}
