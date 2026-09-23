import Link from "next/link";
import { Info } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** The "Don't have an account? Register" line at the bottom. */
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
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

          {/*
            Stated plainly and permanently, not as a toast that disappears.
            Anyone testing this must know no real account exists - otherwise
            they will "log in", close the tab, and wonder why nothing saved.
          */}
          <p className="mb-6 flex items-start gap-2 rounded-lg border border-secondary/30 bg-cyan-soft/60 p-3 text-xs leading-relaxed text-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden="true" />
            <span>
              Firebase Authentication will be connected in Phase 2. This form
              validates your input but does not create or sign in a real account.
            </span>
          </p>

          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footerPrompt}{" "}
          <Link
            href={footerLinkHref}
            className="font-semibold text-secondary transition-colors hover:text-primary"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </Container>
  );
}
