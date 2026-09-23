import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Renders as <section>/<header> etc. instead of <div>, for semantic HTML. */
  as?: "div" | "section" | "header" | "footer" | "nav";
  id?: string;
}

/**
 * The single place the site's max-width and responsive side padding are
 * defined. Repeating these classes in twenty sections means twenty places
 * to fix when the layout changes.
 */
export function Container({ children, className, as: Tag = "div", id }: ContainerProps) {
  return (
    <Tag id={id} className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}
