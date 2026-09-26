#!/usr/bin/env node
/**
 * Turn a product photo into a square, transparent card image.
 *
 *   node scripts/prepare-product-image.mjs <input> <slug>
 *
 * Writes public/images/products/<slug>.png at 800x800.
 *
 * WHY NOT JUST RESIZE THE PHOTO
 * -----------------------------
 * Product photos arrive from all over: different sizes, different
 * aspect ratios, and backgrounds that range from pure white to dark
 * grey. Dropped straight into the grid they look like a jumble - one
 * tile white, the next charcoal, one product tiny and the next
 * cropped through the middle by object-cover.
 *
 * So each one is cut from its background, cropped to the product,
 * centred on a square transparent canvas and scaled to the same size.
 * The card's own background then shows through every tile equally, and
 * the products appear at a consistent scale whatever the source.
 *
 * THE BACKGROUND COLOUR IS DETECTED, not assumed white. One of these
 * photos is on dark grey, and a white-only cut would have left it as a
 * charcoal rectangle among white ones.
 *
 * THE FILL WALKS GRADIENTS. It compares each pixel to the neighbour it
 * spread from as well as to the corner colour, so a softly shaded
 * studio backdrop is removed whole instead of leaving a halo where it
 * darkens away from the seed.
 *
 * AND IT IS SKIPPED ENTIRELY FOR WHITE BACKGROUNDS, which is not a
 * shortcut but a correction. White earphones photographed on white
 * cannot be separated by colour: the first version of this script
 * removed 95.6% of that image, walking through the cable and eating
 * holes out of the earbuds. There is no threshold that distinguishes
 * "white background" from "white product" - the information is not in
 * the pixels.
 *
 * So a white backdrop is kept and the canvas is filled white to match.
 * Product photography on white is the ordinary convention anyway, and
 * every tile ends up on the same white square regardless of what its
 * source looked like. Only a NON-white backdrop is cut, because that
 * is the case where leaving it would make one tile charcoal among
 * white ones.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [, , input, slug] = process.argv;
if (!input || !slug) {
  console.error("Usage: node scripts/prepare-product-image.mjs <input> <slug>");
  process.exit(1);
}

const OUT_DIR = join("public", "images", "products");
const CANVAS = 800;
/** Product fills this much of the square; the rest is breathing room. */
const FIT = 0.88;

/**
 * Close enough to the pixel we spread from - lets the fill follow a
 * gradient. Overridable per image with --step=N.
 */
const STEP_TOLERANCE = Number(
  process.argv.find((a) => a.startsWith("--step="))?.slice(7) ?? 18
);

/**
 * But never stray this far from the corner colour, or it eats the
 * product. Overridable with --seed=N.
 *
 * The default suits a plain backdrop. A studio shot that fades from
 * near-black at the corners to mid-grey behind the product needs far
 * more headroom - at the default it removed only the corners and left
 * a dark block in the middle of a white tile. Raising it is safe when
 * the PRODUCT is light, which is exactly when a dark backdrop is used.
 */
const SEED_TOLERANCE = Number(
  process.argv.find((a) => a.startsWith("--seed="))?.slice(7) ?? 78
);

/** Fill the square with white rather than leaving it transparent. */
const CANVAS_BG = { r: 255, g: 255, b: 255, alpha: 1 };

const src = sharp(readFileSync(input)).ensureAlpha();
const { width, height } = await src.metadata();
const raw = await src.raw().toBuffer();

const rgb = (p) => [raw[p * 4], raw[p * 4 + 1], raw[p * 4 + 2]];
const dist = (a, b) =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/* ---- the background colour, from the four corners ----

   AVERAGED ONLY TO DESCRIBE THE IMAGE, never to drive the fill. One
   photo had dark corners at the top and white ones at the bottom, and
   the average came out mid-grey - a colour present nowhere in it, so
   the fill matched nothing and removed 0%. Each border pixel seeds
   itself below; this average is just for the log line and the
   is-it-white decision. */
const corners = [
  3 + 3 * width,
  width - 4 + 3 * width,
  3 + (height - 4) * width,
  width - 4 + (height - 4) * width,
].map(rgb);
const seed = [0, 1, 2].map((k) => Math.round(corners.reduce((s, c) => s + c[k], 0) / 4));
const cornersAgree = corners.every((c) => dist(c, corners[0]) <= 40);
console.log(`${slug}: ${width}x${height}, background rgb ${JSON.stringify(seed)}`);

/**
 * Is the backdrop white? Then it stays.
 *
 * See the note at the top: a white product on white cannot be cut by
 * colour, and trying destroys it.
 */
const backdropIsWhite = cornersAgree && dist(seed, [255, 255, 255]) <= 12;
console.log(`  backdrop ${backdropIsWhite ? "is white - keeping it" : "will be removed"}`);

/* ---- flood fill inward from the border ---- */
/**
 * Every border pixel is its own seed.
 *
 * A single global seed assumes one backdrop colour. Mixed backdrops -
 * dark at the top, white at the bottom - break that assumption
 * completely. Carrying an `origin` per path lets each region of the
 * border spread on its own terms, while still being bounded: a path
 * may drift STEP_TOLERANCE from the pixel it came from and no more
 * than SEED_TOLERANCE from where that path began.
 */
const cleared = new Uint8Array(width * height);
const stack = [];
const pushSeed = (p) => {
  const c = rgb(p);
  stack.push([p, c, c]);
};
for (let x = 0; x < width; x++) {
  pushSeed(x);
  pushSeed(x + (height - 1) * width);
}
for (let y = 0; y < height; y++) {
  pushSeed(y * width);
  pushSeed(width - 1 + y * width);
}

while (!backdropIsWhite && stack.length) {
  const [p, from, origin] = stack.pop();
  if (cleared[p]) continue;

  const c = rgb(p);
  if (dist(c, from) > STEP_TOLERANCE) continue;
  if (dist(c, origin) > SEED_TOLERANCE) continue;

  cleared[p] = 1;
  raw[p * 4 + 3] = 0;

  const x = p % width;
  const y = (p / width) | 0;
  if (x > 0) stack.push([p - 1, c, origin]);
  if (x < width - 1) stack.push([p + 1, c, origin]);
  if (y > 0) stack.push([p - width, c, origin]);
  if (y < height - 1) stack.push([p + width, c, origin]);
}

const removed = cleared.reduce((n, v) => n + v, 0);
console.log(`  background removed: ${((removed / (width * height)) * 100).toFixed(1)}%`);

/**
 * Optional: clear whatever dark pixels remain, anywhere.
 *
 * A flood fill enters only from the border, so a backdrop ENCLOSED by
 * the product - the gap inside a coiled cable, the space through a
 * handle - is unreachable and survives as a blob. Telling the two
 * apart automatically is the same unsolvable problem as white-on-white,
 * so this is opt-in per image with --drop-dark=N.
 *
 * Only safe when the product itself has no dark parts. Use it on a
 * white charger on black; never on anything with a black component.
 */
const DROP_DARK = Number(
  process.argv.find((a) => a.startsWith("--drop-dark="))?.slice(12) ?? 0
);

if (DROP_DARK > 0) {
  let dropped = 0;
  for (let p = 0; p < width * height; p++) {
    if (raw[p * 4 + 3] === 0) continue;
    const [r, g, b] = rgb(p);
    if (Math.max(r, g, b) <= DROP_DARK) {
      raw[p * 4 + 3] = 0;
      cleared[p] = 1;
      dropped++;
    }
  }
  console.log(`  enclosed dark pixels cleared: ${dropped}`);
}

/**
 * Optional: clear remaining pixels near a given colour, anywhere.
 *
 *   --drop-near=R,G,B:tolerance
 *
 * The sibling of --drop-dark, for a backdrop that is not dark. A watch
 * photographed on a coral gradient left the gradient showing THROUGH
 * the strap loop - enclosed, so the border fill never reached it, and
 * far too light for --drop-dark.
 *
 * Targeting the colour rather than the brightness is what makes it
 * safe: the white clock hands are also light, and a brightness rule
 * would have erased them.
 */
const dropNearArg = process.argv.find((a) => a.startsWith("--drop-near="))?.slice(12);
if (dropNearArg) {
  const [rgbPart, tolPart] = dropNearArg.split(":");
  const target = rgbPart.split(",").map(Number);
  const tol = Number(tolPart ?? 50);
  let dropped = 0;
  for (let p = 0; p < width * height; p++) {
    if (raw[p * 4 + 3] === 0) continue;
    if (dist(rgb(p), target) <= tol) {
      raw[p * 4 + 3] = 0;
      cleared[p] = 1;
      dropped++;
    }
  }
  console.log(`  pixels near ${JSON.stringify(target)} cleared: ${dropped}`);
}

/* ---- soften the boundary so compression fringing does not show ---- */
let feathered = 0;
const mask = Uint8Array.from(cleared);
for (let y = 1; !backdropIsWhite && y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const p = x + y * width;
    if (mask[p]) continue;
    if (!(mask[p - 1] || mask[p + 1] || mask[p - width] || mask[p + width])) continue;
    // Distance from the nearest cleared neighbour, not from a global
    // seed that may describe no part of this image.
    const neighbours = [p - 1, p + 1, p - width, p + width].filter((q) => mask[q]);
    const d = Math.min(...neighbours.map((q) => dist(rgb(p), rgb(q))));
    if (d >= STEP_TOLERANCE * 2) continue;
    raw[p * 4 + 3] = Math.round((255 * d) / (STEP_TOLERANCE * 2));
    feathered++;
  }
}
console.log(`  edge pixels softened: ${feathered}`);

/* ---- crop to the product ---- */
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
const isContent = backdropIsWhite
  ? (p) => dist(rgb(p), seed) > 10
  : (p) => raw[p * 4 + 3] > 8;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isContent(x + y * width)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) {
  console.error("  nothing left - the fill removed the whole image");
  process.exit(1);
}

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;

/* ---- centre on a square canvas at a consistent scale ---- */
const scale = (CANVAS * FIT) / Math.max(cropW, cropH);
const w = Math.max(1, Math.round(cropW * scale));
const h = Math.max(1, Math.round(cropH * scale));

const product = await sharp(raw, { raw: { width, height, channels: 4 } })
  .extract({ left: minX, top: minY, width: cropW, height: cropH })
  .resize(w, h, { fit: "fill" })
  .png()
  .toBuffer();

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `${slug}.png`);

const png = await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 4,
    background: CANVAS_BG,
  },
})
  .composite([
    {
      input: product,
      left: Math.round((CANVAS - w) / 2),
      top: Math.round((CANVAS - h) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(out, png);
console.log(`  wrote ${out} - ${CANVAS}x${CANVAS}, ${png.length} bytes\n`);
