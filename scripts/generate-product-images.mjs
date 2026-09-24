#!/usr/bin/env node
/**
 * Draw a product illustration for every catalogue item.
 *
 *   node scripts/generate-product-images.mjs
 *
 * WHY DRAWINGS AND NOT PHOTOGRAPHS
 * --------------------------------
 * Three of these products are USED handsets. A manufacturer's press
 * photo beside the word "Used" tells a customer the phone looks brand
 * new, and they find out otherwise after travelling to Ketchery Road.
 * The same objection the rest of this codebase raises about invented
 * review counts and awards applies to a borrowed photograph: it is a
 * claim the shop cannot stand behind.
 *
 * An illustration claims only "this is a phone". It is obviously a
 * drawing, so nobody reads a condition into it, and it is honest about
 * being a placeholder while still looking deliberate rather than
 * broken.
 *
 * REPLACE THEM. Photograph the actual shelf and these become
 * unnecessary - the images field is per product, so real photos can be
 * dropped in one at a time without touching this script.
 *
 * Output: public/images/products/<slug>.png, 800x800, drawn as SVG and
 * rasterised with sharp (already present - Next.js uses it).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "images", "products");
mkdirSync(OUT, { recursive: true });

/* The site's own tokens, from app/globals.css. */
const NAVY = "#0b1f3a";
const NAVY_SOFT = "#16365e";
const GOLD = "#f5b301";
const CYAN = "#12b5cb";
const CYAN_SOFT = "#e6f8fb";
const N0 = "#ffffff";
const N50 = "#f7f9fc";
const N200 = "#e2e8f0";
const N500 = "#64748b";

const W = 800;

/** Shared backdrop: soft tint plus a grounding shadow under the object. */
function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${N0}"/>
      <stop offset="1" stop-color="${CYAN_SOFT}"/>
    </linearGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${NAVY}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${NAVY}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${N0}" stop-opacity="0.38"/>
      <stop offset="0.5" stop-color="${N0}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${N0}" stop-opacity="0.20"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${W}" fill="url(#bg)"/>
  <ellipse cx="400" cy="660" rx="230" ry="46" fill="url(#shadow)"/>
  ${inner}
</svg>`;
}

/** A handset, seen face on. */
function phone({ body, screen }) {
  return frame(`
  <g transform="translate(400 390)">
    <rect x="-138" y="-260" width="276" height="520" rx="42" fill="${body}"/>
    <rect x="-138" y="-260" width="276" height="520" rx="42" fill="url(#gloss)"/>
    <rect x="-122" y="-244" width="244" height="488" rx="32" fill="${screen}"/>
    <rect x="-40" y="-244" width="80" height="22" rx="11" fill="${body}"/>
    <g opacity="0.5">
      <rect x="-96" y="-150" width="120" height="10" rx="5" fill="${N0}"/>
      <rect x="-96" y="-124" width="176" height="10" rx="5" fill="${N0}" opacity="0.6"/>
      <rect x="-96" y="-98" width="88" height="10" rx="5" fill="${N0}" opacity="0.45"/>
    </g>
    <circle cx="0" cy="150" r="38" fill="${N0}" opacity="0.16"/>
    <path d="M-16 150 l14 14 l26 -30" stroke="${N0}" stroke-opacity="0.65" stroke-width="9"
          fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`);
}

/** A wall adapter with a short lead. */
function charger({ accent, watts }) {
  return frame(`
  <g transform="translate(400 380)">
    <rect x="-130" y="-150" width="260" height="250" rx="46" fill="${N0}"/>
    <rect x="-130" y="-150" width="260" height="250" rx="46" fill="url(#gloss)"/>
    <rect x="-130" y="-150" width="260" height="250" rx="46" fill="none" stroke="${N200}" stroke-width="4"/>
    <rect x="-52" y="-206" width="26" height="60" rx="8" fill="${N500}"/>
    <rect x="26" y="-206" width="26" height="60" rx="8" fill="${N500}"/>
    <rect x="-44" y="52" width="88" height="26" rx="13" fill="${NAVY}" opacity="0.85"/>
    <text x="0" y="-16" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif"
          font-size="58" font-weight="bold" fill="${accent}">${watts}</text>
    <path d="M0 78 C0 150 96 150 96 214" stroke="${NAVY}" stroke-width="16"
          fill="none" stroke-linecap="round" opacity="0.8"/>
    <rect x="76" y="212" width="40" height="52" rx="10" fill="${NAVY}"/>
  </g>`);
}

/** A back cover, shown from behind with the camera cut out. */
function cover() {
  return frame(`
  <g transform="translate(400 390)">
    <rect x="-142" y="-264" width="284" height="528" rx="46" fill="${CYAN}"/>
    <rect x="-142" y="-264" width="284" height="528" rx="46" fill="url(#gloss)"/>
    <rect x="-118" y="-240" width="236" height="480" rx="34" fill="${N0}" opacity="0.14"/>
    <rect x="-104" y="-216" width="132" height="132" rx="32" fill="${NAVY}" opacity="0.30"/>
    <circle cx="-68" cy="-180" r="26" fill="${NAVY}" opacity="0.55"/>
    <circle cx="-8" cy="-180" r="26" fill="${NAVY}" opacity="0.55"/>
    <circle cx="-68" cy="-120" r="26" fill="${NAVY}" opacity="0.55"/>
    <circle cx="-8" cy="-120" r="18" fill="${GOLD}" opacity="0.85"/>
  </g>`);
}

/** A tempered-glass sheet, tilted, with a shine streak. */
function glass() {
  return frame(`
  <g transform="translate(400 380) rotate(-8)">
    <rect x="-136" y="-250" width="272" height="500" rx="32" fill="${N0}" opacity="0.55"/>
    <rect x="-136" y="-250" width="272" height="500" rx="32" fill="none"
          stroke="${CYAN}" stroke-width="6" opacity="0.9"/>
    <path d="M-136 120 L136 -170 L136 -60 L-136 230 Z" fill="${N0}" opacity="0.5"/>
    <circle cx="0" cy="-214" r="14" fill="${CYAN}" opacity="0.35"/>
    <g transform="translate(0 190)">
      <circle cx="0" cy="0" r="46" fill="${GOLD}"/>
      <text x="0" y="16" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif"
            font-size="34" font-weight="bold" fill="${NAVY}">9H</text>
    </g>
  </g>`);
}

/** A charging case with two buds beside it. */
function earbuds() {
  return frame(`
  <g transform="translate(400 400)">
    <rect x="-120" y="-70" width="240" height="190" rx="54" fill="${N0}"/>
    <rect x="-120" y="-70" width="240" height="190" rx="54" fill="url(#gloss)"/>
    <rect x="-120" y="-70" width="240" height="190" rx="54" fill="none" stroke="${N200}" stroke-width="4"/>
    <rect x="-120" y="-10" width="240" height="6" fill="${N200}"/>
    <circle cx="0" cy="70" r="10" fill="${CYAN}"/>
    <g transform="translate(-150 -150)">
      <circle cx="0" cy="0" r="42" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <rect x="-13" y="28" width="26" height="86" rx="13" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <circle cx="0" cy="0" r="16" fill="${NAVY}" opacity="0.25"/>
    </g>
    <g transform="translate(150 -150)">
      <circle cx="0" cy="0" r="42" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <rect x="-13" y="28" width="26" height="86" rx="13" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <circle cx="0" cy="0" r="16" fill="${NAVY}" opacity="0.25"/>
    </g>
  </g>`);
}

/** A power bank with a charge readout. */
function powerBank() {
  return frame(`
  <g transform="translate(400 380)">
    <rect x="-150" y="-220" width="300" height="440" rx="44" fill="${NAVY}"/>
    <rect x="-150" y="-220" width="300" height="440" rx="44" fill="url(#gloss)"/>
    <rect x="-104" y="-160" width="208" height="112" rx="18" fill="${N0}" opacity="0.10"/>
    <text x="0" y="-78" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif"
          font-size="64" font-weight="bold" fill="${GOLD}">86</text>
    <g opacity="0.9">
      <rect x="-104" y="12" width="60" height="26" rx="8" fill="${CYAN}"/>
      <rect x="-24" y="12" width="60" height="26" rx="8" fill="${CYAN}" opacity="0.55"/>
      <rect x="56" y="12" width="48" height="26" rx="8" fill="${N0}" opacity="0.28"/>
    </g>
    <g transform="translate(0 130)" opacity="0.85">
      <rect x="-92" y="-14" width="66" height="30" rx="7" fill="${N0}" opacity="0.22"/>
      <rect x="-8" y="-14" width="66" height="30" rx="7" fill="${N0}" opacity="0.22"/>
      <rect x="66" y="-10" width="30" height="22" rx="11" fill="${N0}" opacity="0.22"/>
    </g>
  </g>`);
}

/** Wired earphones: two buds, a Y-split and a jack. */
function handsfree() {
  return frame(`
  <g transform="translate(400 330)">
    <path d="M-150 -60 C-150 110 -30 130 0 210 C30 130 150 110 150 -60"
          stroke="${NAVY}" stroke-width="15" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M0 210 L0 300" stroke="${NAVY}" stroke-width="15" stroke-linecap="round" opacity="0.85"/>
    <rect x="-20" y="196" width="40" height="34" rx="9" fill="${NAVY_SOFT}"/>
    <rect x="-16" y="296" width="32" height="76" rx="12" fill="${NAVY}"/>
    <rect x="-9" y="308" width="18" height="10" fill="${GOLD}"/>
    <rect x="-9" y="330" width="18" height="10" fill="${GOLD}"/>
    <g transform="translate(-150 -60)">
      <circle cx="0" cy="0" r="46" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <circle cx="0" cy="0" r="20" fill="${NAVY}" opacity="0.28"/>
    </g>
    <g transform="translate(150 -60)">
      <circle cx="0" cy="0" r="46" fill="${N0}" stroke="${N200}" stroke-width="4"/>
      <circle cx="0" cy="0" r="20" fill="${NAVY}" opacity="0.28"/>
    </g>
  </g>`);
}

/**
 * A braided cable: one arch, a connector hanging at each end.
 *
 * The first attempt drew a loose coil from a free-hand bezier. It read
 * as a cable, but it sat up in the top-left with its shadow stranded
 * below, and the two connectors were rotated by guesswork so neither
 * lined up with the cable it was supposed to terminate. A symmetrical
 * arch fixes all three at once: it is centred by construction, and both
 * ends arrive travelling straight down, so the plugs simply hang.
 */
function cable() {
  const arch = "M-180 190 C-180 20 -100 -140 0 -140 C100 -140 180 20 180 190";
  const plug = (tip) => `
      <rect x="-23" y="-4" width="46" height="84" rx="13" fill="${NAVY}"/>
      <rect x="-13" y="70" width="26" height="22" rx="8" fill="${tip}"/>`;

  return frame(`
  <g transform="translate(400 360)">
    <path d="${arch}" stroke="${NAVY}" stroke-width="30" fill="none"
          stroke-linecap="round" opacity="0.22"/>
    <path d="${arch}" stroke="${NAVY}" stroke-width="18" fill="none"
          stroke-linecap="round" stroke-dasharray="24 14" opacity="0.92"/>
    <g transform="translate(-180 186)">${plug(GOLD)}</g>
    <g transform="translate(180 186)">${plug(CYAN)}</g>
  </g>`);
}

/**
 * One entry per catalogue product.
 *
 * Handset colours follow the real thing loosely - purple for the 12,
 * black for the 11, mint for the A52 - so three phone tiles in a row
 * are not three identical pictures.
 */
const PRODUCTS = [
  { slug: "iphone-12-used", draw: () => phone({ body: "#7c6cf0", screen: "#1b1240" }) },
  { slug: "iphone-11-used", draw: () => phone({ body: "#2b3442", screen: "#0d1117" }) },
  { slug: "samsung-galaxy-a52-used", draw: () => phone({ body: "#6fd2c4", screen: "#0d3b36" }) },
  { slug: "samsung-original-charger-25w", draw: () => charger({ accent: NAVY, watts: "25W" }) },
  { slug: "fast-charger-33w", draw: () => charger({ accent: CYAN, watts: "33W" }) },
  { slug: "silicone-phone-cover", draw: cover },
  { slug: "tempered-glass-screen-protector", draw: glass },
  { slug: "airpods-pro-2nd-gen", draw: earbuds },
  { slug: "power-bank-20000-mah", draw: powerBank },
  { slug: "wired-handsfree", draw: handsfree },
  { slug: "type-c-fast-charging-cable", draw: cable },
];

let written = 0;
for (const p of PRODUCTS) {
  const svg = p.draw();
  const file = join(OUT, `${p.slug}.png`);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(file, png);
  console.log(`  ${String(png.length).padStart(7)} B  ${p.slug}.png`);
  written++;
}

console.log(`\n${written} illustrations written to public/images/products/`);
