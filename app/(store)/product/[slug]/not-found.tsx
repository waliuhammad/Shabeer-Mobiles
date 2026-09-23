import Link from "next/link";
import { PackageX, ArrowLeft } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";

/**
 * Rendered automatically whenever notFound() is called inside
 * app/(store)/product/[slug]/.
 *
 * Because it sits inside the (store) route group, it still gets the normal
 * Header and Footer - the customer lands on a real page of the site, not a
 * bare error screen, and can carry on shopping.
 *
 * Next.js also serves this for a genuinely unmatched URL under this segment,
 * with an HTTP 404 status.
 */
export default function ProductNotFound() {
  return (
    <Container className="flex flex-col items-center justify-center gap-4 py-20 text-center lg:py-28">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageX className="size-8" aria-hidden="true" />
      </span>

      <h1 className="text-2xl font-bold text-primary sm:text-3xl">Product not found</h1>

      <p className="max-w-md text-sm text-muted-foreground sm:text-base">
        This product may have been sold, renamed or removed from the shop. Browse
        the full catalogue to find what you are looking for.
      </p>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-11 bg-accent px-6 font-semibold text-accent-foreground hover:bg-gold-deep">
          <Link href="/shop">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Shop
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 px-6 font-semibold">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    </Container>
  );
}
