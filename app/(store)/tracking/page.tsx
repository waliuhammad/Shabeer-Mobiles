import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TrackingView } from "@/components/tracking/TrackingView";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check the status of your Shabbir Mobiles order.",
  robots: { index: false, follow: true },
};

/**
 * /tracking  and  /tracking?order=SM-1001
 *
 * HOW THE QUERY PARAMETER WORKS
 * -----------------------------
 * A URL has two halves:
 *
 *     /tracking          ?order=SM-1001
 *     ^^^^^^^^^          ^^^^^^^^^^^^^^
 *     the PATH           the QUERY STRING
 *     picks the file     extra named values
 *
 * Everything after `?` is `key=value`, joined by `&`. The path decides
 * WHICH page renders; the query gives that page its arguments. That is why
 * /tracking and /tracking?order=SM-1001 are the same file - unlike
 * /product/[slug], where the value is part of the path and each one is a
 * separate page.
 *
 * Next.js parses the query and hands it to this page as `searchParams`.
 * It is a Promise, so the page is `async` and awaits it.
 *
 * WHY READ IT HERE RATHER THAN WITH useSearchParams():
 * useSearchParams is a Client Component hook, and using it forces the tree
 * up to the nearest <Suspense> boundary to be client-rendered. Reading the
 * prop on the server keeps the heading and breadcrumb as static HTML and
 * passes the value down as an ordinary prop - the same pattern /shop uses.
 */
export default async function TrackingPage({ searchParams }: PageProps<"/tracking">) {
  const params = await searchParams;

  // searchParams values can be string | string[] | undefined - a URL may
  // legitimately repeat a key (?order=a&order=b). Narrow to a single string.
  const orderNumber = typeof params.order === "string" ? params.order : "";

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "Home", href: "/" }, { label: "Track Order" }]}
      />

      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          Track Your Order
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Enter your order number to see exactly where your order has reached.
        </p>
      </div>

      <TrackingView initialOrderNumber={orderNumber} />
    </Container>
  );
}
