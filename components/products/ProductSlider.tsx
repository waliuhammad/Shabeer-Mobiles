"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
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
 * IT CAN BE STOPPED, which is a requirement rather than a courtesy.
 * Content that moves on its own for more than five seconds has to be
 * pausable (WCAG 2.2.2) - motion is a genuine accessibility and
 * nausea problem, and a strip nobody can freeze is one people simply
 * scroll past. So: it pauses on hover, pauses when anything inside
 * takes keyboard focus, has an explicit button, and does not start
 * at all for a visitor whose system asks for reduced motion.
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
    <div className={cn("flex flex-col", className)}>
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
                    "group block size-24 overflow-hidden rounded-xl border border-border bg-white transition-all sm:size-28",
                    "hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                  )}
                >
                  <ProductImage
                    src={product.images[0]}
                    alt=""
                    sizes="112px"
                    wrapperClassName="size-full bg-white"
                    // object-contain, not the component's default cover:
                    // these are cut-out products on white, and cropping
                    // one to fill a square cuts the product itself.
                    className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                    iconClassName="size-5"
                  />
                  <span className="sr-only">{product.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        In normal flow under the strip, not floated over its top-right
        corner: the section heading already puts a "View all" link
        there, and two controls on the same line at the same end read
        as one confusing pair.

        Nothing to pause when the animation never started.
      */}
      {!reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={cn(
            "mt-3 ms-auto flex items-center gap-1.5 rounded-full border border-border",
            "bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
            "hover:border-secondary/40 hover:text-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          )}
        >
          {paused ? (
            <Play className="size-3.5" aria-hidden="true" />
          ) : (
            <Pause className="size-3.5" aria-hidden="true" />
          )}
          {paused ? "Play" : "Pause"}
          <span className="sr-only"> {label}</span>
        </button>
      )}
    </div>
  );
}
