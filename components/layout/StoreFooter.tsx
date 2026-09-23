import Link from "next/link";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/shared/BrandIcons";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import {
  BUSINESS,
  FULL_ADDRESS,
  WHATSAPP_URL,
  FOOTER_QUICK_LINKS,
  FOOTER_SHOP_LINKS,
  FOOTER_CUSTOMER_LINKS,
  type NavLink,
} from "@/lib/constants";

const SOCIALS = [
  { label: "WhatsApp", href: WHATSAPP_URL, Icon: MessageCircle },
  { label: "Facebook", href: WHATSAPP_URL, Icon: FacebookIcon },
  { label: "Instagram", href: WHATSAPP_URL, Icon: InstagramIcon },
];

export function StoreFooter() {
  // Rendered on the server, so this needs no client JavaScript.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-navy-deep text-white/70">
      <Container className="py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">{BUSINESS.description}</p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <FooterLinkColumn title="Quick Links" links={FOOTER_QUICK_LINKS} />
          <FooterLinkColumn title="Shop" links={FOOTER_SHOP_LINKS} />
          <FooterLinkColumn title="Customer Service" links={FOOTER_CUSTOMER_LINKS} />

          {/* Contact column */}
          <div>
            <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Visit Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{FULL_ADDRESS}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{BUSINESS.hours[0].time}</span>
              </li>
              <li>
                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="flex items-center gap-2.5 hover:text-accent"
                >
                  <Phone className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="flex items-center gap-2.5 hover:text-accent"
                >
                  <Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
          <p>
            &copy; {year} {BUSINESS.name}. All rights reserved.
          </p>
          <p>
            {BUSINESS.address.city}, {BUSINESS.address.country}
          </p>
        </Container>
      </div>
    </footer>
  );
}

/**
 * Local helper - two callers, both in this file, so it stays here.
 * Extract to components/shared/ only when a third, external caller appears.
 */
function FooterLinkColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="transition-colors hover:text-accent">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
