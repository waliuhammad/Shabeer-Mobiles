import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * next/image refuses any remote host that is not listed here, and
   * that refusal is the point: without it, anyone who could get a URL
   * into the database could make this site's image optimiser fetch
   * arbitrary remote content and serve it from our own domain.
   *
   * So product photographs are allowed from Cloudinary and nowhere else.
   * The pathname is pinned to /<cloud>/image/upload/** rather than left
   * open, so only this account's delivery URLs are optimised.
   *
   * Without this entry an uploaded photo 400s with "hostname is not
   * configured under images in your next.config" - which looks like a
   * broken upload rather than a missing config line.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
