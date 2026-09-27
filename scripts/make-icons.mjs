#!/usr/bin/env node
/**
 * Generate the browser-tab icon from the shop's own logo mark.
 *
 *   node scripts/make-icons.mjs
 *
 * Writes app/icon.svg, app/apple-icon.png and app/favicon.ico.
 *
 * WHAT IT DRAWS, and why it is not invented here: the mark is the one
 * components/shared/Logo.tsx already renders - a rounded square with
 * lucide's `smartphone` glyph inside it. The glyph below is copied
 * from node_modules/lucide-react/dist/esm/icons/smartphone.mjs rather
 * than redrawn, so the icon and the header cannot drift apart.
 *
 * GOLD ON NAVY, NOT NAVY ON GOLD. The header uses the dark variant -
 * navy square, gold phone - and the footer and admin sidebar use the
 * light one. For a tab icon the light variant wins: at 16px a navy
 * square all but disappears against a dark tab bar, while gold reads
 * on light and dark alike. Both are existing variants of the same
 * mark, so this is a choice between two things the site already
 * shows, not a new design.
 *
 * THE STROKE IS HEAVIER THAN THE HEADER'S. Lucide draws at stroke
 * width 2 in a 24 unit box, which at 16px comes out under one
 * physical pixel and renders as a grey smear. It is thickened here
 * and the glyph fills more of the square than it does at 40px, which
 * is ordinary practice for small sizes - the alternative is a
 * faithful icon nobody can make out.
 */

import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const GOLD = "#f5b301"; // --brand-gold
const NAVY = "#0b1f3a"; // --brand-navy

/**
 * lucide `smartphone`, verbatim:
 *   rect w14 h20 x5 y2 rx2 ry2
 *   path M12 18h.01      (a dot, given round linecaps)
 * Native box is 24x24; the drawn bounds including the stroke run
 * 4..20 horizontally and 1..23 vertically, so it centres on (12,12).
 */
const GLYPH = `<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`;

const BOX = 64;
const RADIUS = 14; // ~22%, matching rounded-lg on the 40px header square
const SCALE = 1.9;
const STROKE = 2.4;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}">
  <rect width="${BOX}" height="${BOX}" rx="${RADIUS}" fill="${GOLD}"/>
  <g transform="translate(${BOX / 2} ${BOX / 2}) scale(${SCALE}) translate(-12 -12)"
     fill="none" stroke="${NAVY}" stroke-width="${STROKE}"
     stroke-linecap="round" stroke-linejoin="round">${GLYPH}</g>
</svg>
`;

const APP = "app";
writeFileSync(join(APP, "icon.svg"), svg);
console.log(`wrote ${join(APP, "icon.svg")}`);

const png = async (size) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/* Apple wants a square PNG at 180 and does not round it itself. */
const apple = await png(180);
writeFileSync(join(APP, "apple-icon.png"), apple);
console.log(`wrote ${join(APP, "apple-icon.png")} - 180x180, ${apple.length} bytes`);

/**
 * A real .ico, replacing the create-next-app default.
 *
 * Not strictly required - a declared icon.svg is enough for current
 * browsers - but /favicon.ico is still requested directly by feed
 * readers, older bookmarks and anything that guesses the path rather
 * than reading the HTML. Leaving Vercel's triangle there would keep
 * showing it to all of them.
 *
 * ICO is a thin container: a 6-byte header, a 16-byte entry per
 * image, then the image data. Modern .ico may hold PNGs directly,
 * which is what this does - no BMP encoding needed.
 */
const SIZES = [16, 32, 48];
const images = await Promise.all(SIZES.map(png));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(images.length, 4);

const entries = [];
let offset = 6 + 16 * images.length;
images.forEach((img, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(SIZES[i] === 256 ? 0 : SIZES[i], 0); // width
  e.writeUInt8(SIZES[i] === 256 ? 0 : SIZES[i], 1); // height
  e.writeUInt8(0, 2); // palette size
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(img.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += img.length;
  entries.push(e);
});

const ico = Buffer.concat([header, ...entries, ...images]);
const icoPath = join(APP, "favicon.ico");
if (existsSync(icoPath)) unlinkSync(icoPath);
writeFileSync(icoPath, ico);
console.log(`wrote ${icoPath} - ${SIZES.join("/")}px, ${ico.length} bytes`);
