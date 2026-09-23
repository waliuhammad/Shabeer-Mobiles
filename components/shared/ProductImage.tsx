import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  /** Usually product.images[0]. undefined / null / "" all mean "no image". */
  src?: string | null;
  /** Required. Screen readers and broken-image text depend on it. */
  alt: string;
  /**
   * Tells the browser how wide this renders at each breakpoint, so it
   * downloads the right size instead of a desktop-sized file on a phone.
   */
  sizes?: string;
  /** Set true ONLY for an above-the-fold image. */
  priority?: boolean;
  /** Classes for the image itself, e.g. a hover zoom. */
  className?: string;
  /** Classes for the wrapper - this is where you set the aspect ratio. */
  wrapperClassName?: string;
  /** Size of the fallback icon. */
  iconClassName?: string;
}

/**
 * Renders a product image with a branded fallback.
 *
 * "No image" is a supported state, not an error: every product in Phase 1
 * has images: []. When Cloudinary URLs arrive, the arrays fill and this
 * component starts rendering real photos - no caller changes.
 */
export function ProductImage({
  src,
  alt,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  className,
  wrapperClassName,
  iconClassName,
}: ProductImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", wrapperClassName)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", className)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-muted to-cyan-soft text-muted-foreground">
          <ImageOff className={cn("size-7", iconClassName)} aria-hidden="true" />
          <span className="px-3 text-center text-[10px] font-medium leading-tight">
            Image coming soon
          </span>
        </div>
      )}
    </div>
  );
}
