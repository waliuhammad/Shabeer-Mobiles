import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  /** Buttons that belong to this page, e.g. "Add Product". */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The heading block every admin page opens with.
 *
 * Fifteen pages each hand-rolling a title and subtitle is fifteen chances
 * for the spacing and type scale to drift. One component, one rhythm.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {/* h2, not h1 - AdminTopbar already renders the h1 for this page,
            and a document should have exactly one. */}
        <h2 className="font-heading text-xl font-bold text-primary sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
