import Link from "next/link";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS } from "@/lib/constants";

interface LogoProps {
  /** Light text for dark backgrounds (footer, admin sidebar). */
  variant?: "dark" | "light";
  /** Hide the tagline on cramped surfaces like the mobile header. */
  showTagline?: boolean;
  className?: string;
}

/**
 * Temporary text mark until the real asset is available.
 *
 * TO SWAP IN THE REAL LOGO:
 *   1. drop the file at /public/images/logo.png
 *   2. replace the <span> icon block below with <Image src=... />
 *   Nothing else changes - Header, Footer and MobileMenu all render <Logo />.
 */
export function Logo({ variant = "dark", showTagline = true, className }: LogoProps) {
  const isLight = variant === "light";

  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${BUSINESS.name} - home`}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          isLight ? "bg-accent text-navy" : "bg-primary text-accent group-hover:bg-navy-soft"
        )}
      >
        <Smartphone className="size-5" aria-hidden="true" />
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-base font-bold tracking-tight sm:text-lg",
            isLight ? "text-white" : "text-primary"
          )}
        >
          SHABBIR <span className="text-secondary">MOBILES</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.14em]",
              isLight ? "text-white/60" : "text-muted-foreground"
            )}
          >
            {BUSINESS.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
