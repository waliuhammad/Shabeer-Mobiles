"use client";

import { useState } from "react";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  /**
   * The product's image list, straight from `product.images`.
   *
   * Driven entirely by the ARRAY - there are no image1/image2/image3
   * variables anywhere. Whether Firestore returns zero, one or eight URLs,
   * this component renders correctly with no code change.
   */
  images: string[];
  alt: string;
}

/**
 * Main image plus a thumbnail strip.
 *
 * "use client" because switching thumbnails is state. It is a small island:
 * the rest of the product page stays server-rendered.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  // Index, not the URL itself. If two entries were ever identical, an index
  // still identifies exactly which thumbnail is selected.
  const [activeIndex, setActiveIndex] = useState(0);

  // Guards against an out-of-range index and against an empty array, in
  // which case ProductImage renders its placeholder.
  const activeImage = images[activeIndex] ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <ProductImage
        src={activeImage}
        alt={alt}
        // The LCP image on this page, so it loads first.
        priority
        sizes="(max-width: 1024px) 100vw, 45vw"
        wrapperClassName="aspect-square rounded-xl border border-border"
        iconClassName="size-12"
      />

      {/* Only render the strip when there is something to switch between. */}
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={cn(
                  "block w-full overflow-hidden rounded-lg border-2 transition-colors",
                  index === activeIndex
                    ? "border-secondary"
                    : "border-border hover:border-secondary/50"
                )}
              >
                <ProductImage
                  src={image}
                  alt=""
                  sizes="120px"
                  wrapperClassName="aspect-square"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
