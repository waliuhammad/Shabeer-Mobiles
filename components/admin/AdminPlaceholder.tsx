import { createElement } from "react";
import { Hammer, type LucideIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface AdminPlaceholderProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  /** What this screen will actually do, once built. */
  planned: string[];
  /** Which Phase 1C step builds it. */
  phase: string;
}

/**
 * The "not built yet" screen, shared by all fourteen placeholder routes.
 *
 * WHY ONE COMPONENT RATHER THAN FOURTEEN HAND-WRITTEN PAGES:
 * they would differ within a week, and every one of them is going to be
 * deleted anyway as its real screen gets built. The page files stay three
 * lines each, which makes replacing one a genuinely small change.
 *
 * It lists what the screen WILL do rather than just saying "coming soon" -
 * so the route doubles as the plan, and nobody has to guess what
 * /admin/purchases was for.
 */
export function AdminPlaceholder({
  title,
  description,
  Icon,
  planned,
  phase,
}: AdminPlaceholderProps) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />

      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {createElement(Icon, { className: "size-7", "aria-hidden": "true" })}
        </span>

        <p className="flex items-center justify-center gap-2 font-heading text-base font-bold text-primary">
          <Hammer className="size-4 text-accent" aria-hidden="true" />
          Not built yet
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          This screen is scheduled for {phase}. The route, layout and
          navigation are in place so it can be dropped in without touching
          anything else.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-lg border border-border bg-muted/40 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            What it will do
          </p>
          <ul className="space-y-1.5">
            {planned.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
