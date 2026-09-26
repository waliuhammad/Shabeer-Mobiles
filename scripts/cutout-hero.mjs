#!/usr/bin/env node
/**
 * Turn a flat-background product photo into a transparent hero image.
 *
 *   node scripts/cutout-hero.mjs hero-new.png
 *   node scripts/cutout-hero.mjs hero-new.png --tol=26
 *   node scripts/cutout-hero.mjs hero-new.png --backdrop=30,61,88
 *
 * THE BACKDROP IS READ OFF THE BORDER, NOT ASSUMED TO BE WHITE.
 * -------------------------------------------------------------
 * Heroes have arrived on white, on navy, and pre-cut. The rule that
 * covers all three is the same one: whatever colour the border is, that
 * is the backdrop. The script takes the median of the border pixels and
 * treats colours within --tol of it as background. A white photo lands
 * on ~255,255,255 and behaves exactly as it did before this was
 * generalised; a navy one lands on its own navy.
 *
 * WHY A FLOOD FILL AND NOT "REMOVE EVERY PIXEL OF THAT COLOUR"
 * ------------------------------------------------------------
 * The collage contains backdrop-coloured THINGS: white AirPods and
 * cables on a white shot, dark phones and black headphones on a navy
 * one. Removing every matching pixel would punch holes straight
 * through them.
 *
 * So this fills inward from the BORDER and stops at the subject. A
 * pixel is only erased if there is an unbroken path of backdrop from
 * the edge of the image to it - which is exactly what "background"
 * means here, and what "the white bits of an AirPod" does not.
 *
 * A BORDER THAT IS ALREADY TRANSPARENT is left alone: the picture was
 * cut at source, there is nothing to flood, and the script just crops.
 *
 * It then crops to whatever is left opaque, which removes the large
 * empty margins a phone screenshot carries, and feathers the boundary
 * so compression fringing does not leave a halo on the navy hero.
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";

const input = process.argv[2];

if (!input) {
  console.error("Usage: node scripts/cutout-hero.mjs <input>");
  process.exit(1);
}

/**
 * The output is named after its own CONTENT, and that is not tidiness.
 *
 * Next.js and Vercel cache an optimised image against its URL, never
 * its bytes. Replacing hero-devices.png in place therefore served the
 * PREVIOUS picture from cache - the build was correct, the file on disk
 * was correct, and the site showed the old image anyway. It took a
 * screenshot to notice.
 *
 * A content hash in the filename makes that impossible: different
 * pixels, different URL, nothing to serve stale. Old hero files are
 * removed so the folder does not accumulate them.
 */
const OUT_DIR = "public/images";
const OUT_PREFIX = "hero-devices";

/**
 * How far a pixel may sit from the backdrop colour and still count as
 * backdrop, per channel.
 *
 * 21 is what the old white-only rule came to: it erased a pixel whose
 * every channel was >= 234, i.e. within 21 of 255. Keeping the number
 * keeps a white photo cutting exactly as it did. It is deliberately
 * tight - a gradient backdrop will not fully clear at this tolerance,
 * and that is the safe direction to fail, because the loose direction
 * eats the product.
 */
const DEFAULT_TOLERANCE = 21;
/** Beyond TOLERANCE, a boundary pixel fades out over this much more. */
const FEATHER_SPAN = 34;

const tolArg = process.argv.find((a) => a.startsWith("--tol="));
const TOLERANCE = tolArg ? Number(tolArg.slice(6)) : DEFAULT_TOLERANCE;

const src = sharp(readFileSync(input)).ensureAlpha();
const { width, height } = await src.metadata();
const raw = await src.raw().toBuffer();

console.log(`input: ${width}x${height}`);

/* ---- what colour is the backdrop? ----
   Read it off the border rather than assuming white. The median, not
   the mean: a mean of a dark top edge and a light bottom edge is a
   mid-grey that matches neither, and silently removes nothing. */
const borderIdx = [];
for (let x = 0; x < width; x++) borderIdx.push(x, x + (height - 1) * width);
for (let y = 0; y < height; y++) borderIdx.push(y * width, width - 1 + y * width);

const borderArg = process.argv.find((a) => a.startsWith("--backdrop="));
const median = (arr) => arr.sort((a, b) => a - b)[arr.length >> 1];

let backdrop;
let borderAlpha = 0;
for (const p of borderIdx) borderAlpha += raw[p * 4 + 3];
borderAlpha /= borderIdx.length;

if (borderArg) {
  backdrop = borderArg.slice(11).split(",").map(Number);
  console.log(`backdrop: ${backdrop.join(",")} (given)`);
} else if (borderAlpha < 8) {
  backdrop = null;
  console.log("backdrop: none - the border is already transparent, so nothing to flood");
} else {
  backdrop = [0, 1, 2].map((c) => median(borderIdx.map((p) => raw[p * 4 + c])));
  /* How uniform is that border? A spread this wide means the backdrop
     is not flat, and a single colour will leave most of it behind. */
  const spread = [0, 1, 2].map((c) => {
    const vals = borderIdx.map((p) => raw[p * 4 + c]);
    return Math.max(...vals) - Math.min(...vals);
  });
  console.log(`backdrop: ${backdrop.join(",")} (from the border, spread ${spread.join("/")})`);
  if (Math.max(...spread) > TOLERANCE * 3) {
    console.log("  warning: the border is not one flat colour - expect an incomplete cut");
  }
}

/** Distance from the backdrop colour, as the largest per-channel gap. */
const gap = (i) =>
  Math.max(
    Math.abs(raw[i] - backdrop[0]),
    Math.abs(raw[i + 1] - backdrop[1]),
    Math.abs(raw[i + 2] - backdrop[2])
  );

const isBackdrop = (i) => gap(i) <= TOLERANCE;

/* ---- flood fill inward from every border pixel ---- */
const transparent = new Uint8Array(width * height);

if (backdrop) {
  const stack = [...borderIdx];

  while (stack.length) {
    const p = stack.pop();
    if (transparent[p]) continue;
    if (!isBackdrop(p * 4)) continue;

    transparent[p] = 1;

    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
}

let cleared = 0;
for (let p = 0; p < transparent.length; p++) {
  if (transparent[p]) {
    raw[p * 4 + 3] = 0;
    cleared++;
  } else if (raw[p * 4 + 3] === 0) {
    /* Already transparent at source. Count it so the crop below and
       the percentage reported agree with each other. */
    transparent[p] = 1;
    cleared++;
  }
}
console.log(`background removed: ${((cleared / (width * height)) * 100).toFixed(1)}% of pixels`);

/* ---- feather the boundary ----
   A pixel still opaque but touching transparency, and still close to
   the backdrop colour, is almost certainly compression fringe rather
   than the product. Fading it stops an outline in the backdrop's
   colour appearing once the image sits on the hero's navy - which is a
   pale halo on a white source and a lighter navy edge on a navy one. */
let feathered = 0;

if (backdrop) {
  const alphaCopy = new Uint8Array(width * height);
  for (let p = 0; p < transparent.length; p++) alphaCopy[p] = transparent[p];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = x + y * width;
      if (alphaCopy[p]) continue;
      const touchesHole =
        alphaCopy[p - 1] || alphaCopy[p + 1] || alphaCopy[p - width] || alphaCopy[p + width];
      if (!touchesHole) continue;

      const i = p * 4;
      const d = gap(i);
      if (d > TOLERANCE + FEATHER_SPAN) continue;

      // At the tolerance edge -> fully clear; FEATHER_SPAN beyond it -> opaque.
      const t = (d - TOLERANCE) / FEATHER_SPAN;
      raw[i + 3] = Math.round(255 * t);
      feathered++;
    }
  }
}
console.log(`edge pixels softened: ${feathered}`);

/* ---- crop to what is actually left ---- */
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (raw[(x + y * width) * 4 + 3] > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < 0) {
  console.error("Nothing opaque left - the threshold removed the whole image.");
  process.exit(1);
}

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
console.log(
  `subject found at ${minX},${minY} -> ${cropW}x${cropH}` +
    ` (${(100 - (cropW * cropH * 100) / (width * height)).toFixed(0)}% of the file was margin)`
);

const png = await sharp(raw, { raw: { width, height, channels: 4 } })
  .extract({ left: minX, top: minY, width: cropW, height: cropH })
  .png({ compressionLevel: 9 })
  .toBuffer();

const hash = createHash("sha1").update(png).digest("hex").slice(0, 8);
const filename = `${OUT_PREFIX}-${hash}.png`;
const output = join(OUT_DIR, filename);

for (const existing of readdirSync(OUT_DIR)) {
  if (existing.startsWith(OUT_PREFIX) && existing !== filename) {
    unlinkSync(join(OUT_DIR, existing));
    console.log(`removed previous hero: ${existing}`);
  }
}

writeFileSync(output, png);

console.log(`\nwrote ${output} - ${cropW}x${cropH}, ${png.length} bytes`);
console.log("\nIn components/home/Hero.tsx set:");
console.log(`  src="/images/${filename}"`);
console.log(`  width={${cropW}}`);
console.log(`  height={${cropH}}`);
