"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductSliderProps {
  products: Product[];
  /** Names the strip for screen readers and the pause button. */
  label: string;
  /**
   * Seconds each product takes to cross the screen. Duration is
   * derived from this and the product count, so the strip moves at
   * one speed whether the shop stocks eight things or eighty.
   */
  secondsPerProduct?: number;
  className?: string;
}

/**
 * An auto-running strip of product pictures.
 *
 * PICTURES ONLY. No name, price, stock line or button - those are
 * what the grid below is for. A tile this size cannot hold a
 * two-line product name legibly, and a price that has to be read
 * before it slides away is a price nobody reads. Each tile is still
 * a link, and still carries the product name for screen readers.
 *
 * A CSS ANIMATION, NOT A SCROLL LOOP. Animating transform runs on
 * the compositor and does not touch layout; a setInterval nudging
 * scrollLeft re-runs layout on every tick, fights the user's own
 * scrolling and stutters under load. It also means pausing is one
 * CSS property rather than teardown logic.
 *
 * IT CAN STILL BE STOPPED, without the button.
 *
 * Content that moves on its own for more than five seconds is meant
 * to be pausable (WCAG 2.2.2) - motion is a real accessibility and
 * nausea problem, not a preference. The shop asked for the explicit
 * Pause control to go, so the three implicit ones are all that is
 * left and none of them may be removed casually: it pauses on hover,
 * it pauses when anything inside takes keyboard focus, and it never
 * starts at all for a visitor whose system asks for reduced motion.
 *
 * What that costs is discoverability - nothing on screen says the
 * strip can be held still - and it leaves a touch user who has not
 * set a motion preference with no way to stop it. If that matters
 * later, the button is a dozen lines; it was removed, not lost.
 */
export function ProductSlider({
  products,
  label,
  secondsPerProduct = 2.6,
  className,
}: ProductSliderProps) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (products.length === 0) return null;

  /**
   * The list twice. The first copy scrolls out of frame exactly as
   * the second arrives where it started, so there is no seam and no
   * jump - see the note beside @keyframes marquee-x in globals.css.
   */
  const track = [...products, ...products];
  const duration = `${(products.length * secondsPerProduct).toFixed(1)}s`;

  return (
    <div className={className}>
      {/*
        A TINTED PANEL, because glass needs something behind it.

        Frosted glass is a translucent surface plus a blurred view of
        whatever it covers. On the plain white section this sits in
        there is nothing to see through, so the tiles would come out
        as very slightly grey rectangles and nothing more. The soft
        brand wash below is what the blur has to work with - part of
        the effect, not decoration added beside it.
      */}
      <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-linear-to-br from-cyan-soft/60 via-background to-accent/15 p-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] sm:p-5">
        <div
          ref={frame}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        // Focus, not just hover: a keyboard user tabbing into a tile
        // would otherwise have it slide out from under them.
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!frame.current?.contains(e.relatedTarget as Node | null)) setPaused(false);
        }}
        className={cn(
          /**
           * `relative` is not decoration. A statically positioned
           * scroll container still contributes its overflowing
           * content to the VIEWPORT's scrollable area in Chrome, so
           * the 5376px track made the whole page scroll sideways
           * even though the frame clipped it visually.
           *
           * Found by trying candidates in the live page rather than
           * reasoning about it: overflow-x hidden, overflow-x clip,
           * max-width 100% and display flow-root all left the page
           * overflowing 3929px; position relative took it to 0.
           *
           * With motion on it accidentally worked already, because
           * `will-change: transform` on the animated track contains
           * it - which is exactly the kind of accident that breaks
           * the moment the animation is switched off, and did.
           */
          "relative overflow-hidden",
          // With motion switched off the strip stops being a strip and
          // becomes something to push by hand, rather than a row
          // permanently showing only its first few items.
          reducedMotion && "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        <ul
          className={cn(
            "flex w-max items-stretch",
            !reducedMotion && "marquee-track"
          )}
          /**
           * Play state inline rather than as a class. A class puts the
           * answer at the mercy of the cascade - which it lost once
           * already - whereas an inline style cannot be outranked by
           * anything without !important. The duration rides along the
           * same way.
           */
          style={
            {
              "--marquee-duration": duration,
              animationPlayState: paused ? "paused" : "running",
            } as React.CSSProperties
          }
          aria-label={label}
        >
          {track.map((product, i) => {
            // The second copy exists only to make the loop seamless.
            // Hiding it stops every product being announced twice.
            const isClone = i >= products.length;
            return (
              <li
                key={`${product.id}-${isClone ? "clone" : "real"}`}
                className="me-3 shrink-0 sm:me-4"
                aria-hidden={isClone || undefined}
              >
                <Link
                  href={`/product/${product.slug}`}
                  tabIndex={isClone ? -1 : undefined}
                  className={cn(
                    /**
                     * TALLER THAN WIDE, 4:5, rather than the square
                     * these started as. Almost everything the shop
                     * sells stands upright in its photograph - phones,
                     * cases, chargers, power banks, the stand - so a
                     * square tile spent its width on white margin and
                     * then shrank the product to fit the height. The
                     * portrait box gives that height back.
                     */
                    "group block h-36 w-28 overflow-hidden rounded-xl sm:h-44 sm:w-36",
                    // The glass: a part-transparent surface, a blur of
                    // what sits behind it, a bright hairline where the
                    // light catches the edge, and a soft shadow so it
                    // reads as lying above the panel rather than
                    // printed on it.
                    "border border-white/70 bg-white/35 backdrop-blur-md",
                    "shadow-[0_4px_16px_rgba(11,31,58,0.10)] ring-1 ring-inset ring-white/40",
                    "transition-all duration-300",
                    "hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/55 hover:shadow-[0_10px_28px_rgba(11,31,58,0.16)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                  )}
                >
                  <ProductImage
                    src={product.images[0]}
                    alt=""
                    sizes="(max-width: 640px) 112px, 144px"
                    wrapperClassName="size-full bg-transparent"
                    /**
                     * object-contain, not the component's default
                     * cover: these are cut-out products on white, and
                     * cropping one to fill the box cuts the product.
                     *
                     * mix-blend-multiply is what makes the glass
                     * visible at all. Every prepared product image is
                     * 100% opaque with pure white behind the product -
                     * measured, not assumed - so a translucent tile
                     * holding one would still look like a solid white
                     * card. Multiply leaves white alone (white x
                     * anything = anything) and keeps everything
                     * darker, so the plate disappears into the glass
                     * and only the charger or the cable is left.
                     */
                    className="object-contain p-1.5 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                    iconClassName="size-5"
                  />
                  <span className="sr-only">{product.name}</span>
                </Link>
              </li>
            );
          })}
          </ul>
        </div>
      </div>
    </div>
  );
}
