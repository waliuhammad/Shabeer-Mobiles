import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /**
   * The "Don't have an account? Register" line at the bottom.
   *
   * OPTIONAL, all three together. With customer accounts switched off
   * there is nowhere for that line to point - /register 404s - and a
   * sign-in page for staff has no second page to offer. Omit them and
   * the line is not rendered at all, rather than rendering a prompt with
   * a dead link in it.
   */
  footerPrompt?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
}

/**
 * The card that /login and /register share.
 *
 * Both pages need the same centred card, logo, heading and demo notice.
 * Putting it here means the two pages contain only what actually differs -
 * their form - and they cannot drift apart visually.
 *
 * A Server Component: only the forms inside it are interactive.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
}: AuthShellProps) {
  return (
    <Container className="flex justify-center py-10 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>

        {footerPrompt && footerLinkLabel && footerLinkHref && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footerPrompt}{" "}
            <Link
              href={footerLinkHref}
              className="font-semibold text-secondary transition-colors hover:text-primary"
            >
              {footerLinkLabel}
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
