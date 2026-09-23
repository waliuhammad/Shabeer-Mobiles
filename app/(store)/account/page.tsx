import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { AccountView } from "@/components/account/AccountView";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your Shabbir Mobiles orders, addresses and profile.",
  // Personal, and must never appear in search results.
  robots: { index: false, follow: false },
};

/**
 * /account - a Server Component shell around one client island.
 *
 * GUARDED FOR REAL as of the Firebase step. requireUser() verifies the
 * session cookie with the Admin SDK before anything renders; a visitor
 * without a valid session is redirected to /login and gets no markup.
 *
 * STILL OUTSTANDING: the orders shown below are demo data, so "your"
 * orders are the same for everyone. Once orders live in Firestore, a
 * Security Rule must make reading another customer's order impossible
 * regardless of what this page does - a signed-in user is not the same
 * thing as an authorised one.
 */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "Home", href: "/" }, { label: "My Account" }]}
      />

      <h1 className="mb-6 text-2xl font-bold text-primary sm:text-3xl">My Account</h1>

      {/* Proof the session is real and server-verified, not a UI guess. */}
      <p className="mb-6 text-sm text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">
          {user.displayName ?? user.email ?? user.phone}
        </span>
      </p>

      <AccountView user={user} />
    </Container>
  );
}
