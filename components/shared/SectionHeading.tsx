import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Optional "View all ->" link on the right. */
  action?: { label: string; href: string };
  align?: "left" | "center";
  className?: string;
}

/**
 * Keeps every section heading on the site to the same rhythm. Consistency
 * becomes the default rather than something you have to remember.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-secondary"
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
