import { ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUSINESS,
  DIRECTIONS_URL,
  FULL_ADDRESS,
  MAP_QUERY,
  MAP_ZOOM,
} from "@/lib/constants";

interface ShopMapProps {
  className?: string;
  /** Show the address bar under the map. Off for tight placements. */
  showCaption?: boolean;
}

/**
 * The live, interactive Google Map of the shop.
 *
 * A Server Component. An embedded map is just an iframe - it needs no
 * JavaScript from us, so there is no reason to make this a client island.
 * Google's own script runs sandboxed inside the frame.
 *
 * TWO MODES, chosen automatically:
 *
 *  1. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set
 *     -> the official Maps Embed API. Documented, supported, and free with
 *        no usage cap (the Embed API is not billed like the JS API is).
 *        This is what you want in production.
 *
 *  2. No key set (the default today)
 *     -> the classic keyless embed. It needs no Google account at all and
 *        works immediately. It is not a documented endpoint, so Google
 *        could change it one day - which is exactly why path 1 exists.
 *
 * Either way this component's markup, sizing and callers are identical.
 */
export function ShopMap({ className, showCaption = true }: ShopMapProps) {
  // NEXT_PUBLIC_ variables are inlined into the bundle at build time, so
  // this is readable on the server AND in the browser. That is correct for
  // a Maps Embed key, which is meant to be public - protect it by
  // restricting it to your domain in the Google Cloud console, NOT by
  // hiding it. Never use the NEXT_PUBLIC_ prefix for a real secret.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
        MAP_QUERY
      )}&zoom=${MAP_ZOOM}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
        MAP_QUERY
      )}&z=${MAP_ZOOM}&output=embed`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      {/* The map fills the available height on desktop and keeps a sensible
          minimum on mobile, so it never collapses to a sliver. */}
      <div className="relative min-h-[280px] flex-1 bg-muted">
        <iframe
          src={src}
          // A title is REQUIRED on an iframe: screen readers announce it as
          // the frame's name. Without one it reads out as "frame".
          title={`Map showing ${BUSINESS.name}, ${FULL_ADDRESS}`}
          // The map sits well below the fold. Lazy loading keeps Google's
          // payload out of the initial page load entirely.
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>

      {showCaption && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">{FULL_ADDRESS}</span>
          </p>

          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-secondary"
          >
            Open in Google Maps
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
