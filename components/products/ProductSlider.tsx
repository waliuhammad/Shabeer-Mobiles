"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductSliderProps {
  products: Product[];
  /** Names the scroll region for screen readers and for the arrow labels. */
  label: string;
  className?: string;
}

/**
 * A horizontal row of ProductCards that scrolls sideways.
 *
 * NATIVE SCROLLING, NOT A CAROUSEL LIBRARY. The project has no carousel
 * dependency and did not need one. `overflow-x-auto` plus scroll-snap
 * gives touch dragging, trackpad swiping, shift+wheel, keyboard arrows,
 * a draggable scrollbar and correct focus behaviour for free - all of
 * which a JavaScript carousel has to reimplement, usually worse. The
 * only thing added here is two buttons for mouse users, who otherwise
 * have no obvious way to scroll a region sideways.
 *
 * BECAUSE IT IS A SCROLL CONTAINER, it cannot widen the page. That
 * matters: a horizontal strip of cards is exactly the shape of bug
 * that put a scrollbar across the whole site earlier today. An
 * element with overflow-x: auto scrolls its own content instead of
 * pushing the document open, so the cards inside are contained by
 * construction rather than by hoping their widths add up.
 *
 * THE CARDS ARE DELIBERATELY NOT A WHOLE NUMBER PER SCREEN. Each
 * breakpoint leaves part of the next card visible, because a row that
 * ends flush with the edge looks like a row that has ended. The peek
 * is what tells you there is more.
 */
export function ProductSlider({ products, label, className }: ProductSliderProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  /**
   * Both true at once means the content fits and there is nothing to
   * scroll, which is how the arrows know to hide. Starting both true
   * means they are hidden until measured, rather than flashing on and
   * then disappearing.
   */
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely lands
    // exactly on 0 or on max, and a disabled-looking arrow you cannot
    // press at the very end is worse than one press that does nothing.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    // Width changes without a scroll event - rotating a phone, opening
    // devtools, or the cards reflowing at a breakpoint.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure, products.length]);

  const page = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    /**
     * Not a card width - a card width is a different number at every
     * breakpoint, and hard-coding it means the arrows disagree with
     * the layout. Just under a full viewport keeps a card of context
     * on screen across the jump.
     */
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };

  if (products.length === 0) return null;

  const scrollable = !(atStart && atEnd);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        /**
         * tabIndex makes the region focusable so a keyboard user can
         * reach it and scroll with the arrow keys. role + aria-label
         * are what make that focus stop explicable rather than a
         * mystery tab stop.
         */
        tabIndex={0}
        role="region"
        aria-label={label}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-4",
          // The scrollbar is hidden, not the scrolling. Every input
          // method still works; only the grey bar under the cards goes.
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // A visible ring when focused by keyboard, nothing on click.
          "rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        )}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[62%] shrink-0 snap-start sm:w-[44%] md:w-[33%] lg:w-[25.5%] xl:w-[20.5%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/*
        MOUSE-ONLY AFFORDANCE, and hidden below lg for that reason.
        Touch users drag; the buttons would only cover the cards. They
        are also aria-hidden with tabIndex -1: the scroll region above
        is already focusable and scrolls with the arrow keys, so
        exposing these would add two tab stops that do nothing new.
      */}
      {scrollable && (
        <>
          <SliderButton
            direction="prev"
            label={label}
            disabled={atStart}
            onClick={() => page(-1)}
          />
          <SliderButton
            direction="next"
            label={label}
            disabled={atEnd}
            onClick={() => page(1)}
          />
        </>
      )}
    </div>
  );
}

function SliderButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
      aria-hidden="true"
      className={cn(
        "absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-border bg-card text-primary shadow-md transition-all",
        "hover:border-secondary/40 hover:text-secondary",
        // Faded rather than removed at the ends, so the row does not
        // jump sideways as a button appears and disappears.
        "disabled:pointer-events-none disabled:opacity-0",
        "lg:flex",
        isPrev ? "-left-4" : "-right-4"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="sr-only">
        {isPrev ? "Scroll back through" : "Scroll forward through"} {label}
      </span>
    </button>
  );
}
