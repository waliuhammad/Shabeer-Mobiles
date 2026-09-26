#!/usr/bin/env node
/**
 * Turn a white-background product photo into a transparent hero image.
 *
 *   node scripts/cutout-hero.mjs hero-new.png
 *
 * WHY A FLOOD FILL AND NOT "REMOVE EVERY WHITE PIXEL"
 * ---------------------------------------------------
 * The collage contains white THINGS: AirPods, a white watch strap, pale
 * phone frames, bright screen highlights. Removing every light pixel
 * would punch holes straight through them.
 *
 * So this fills inward from the BORDER and stops at the subject. A white
 * pixel is only erased if there is an unbroken path of white from the
 * edge of the image to it - which is exactly what "background" means
 * here, and what "the white bits of an AirPod" does not.
 *
 * It then crops to whatever is left opaque, which removes the large
 * empty margins a phone screenshot carries, and feathers the boundary
 * so JPEG fringing does not leave a grey halo on the navy hero.
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

/** A pixel this light, reached from the edge, is background. */
const BACKGROUND_MIN = 234;
/** Boundary pixels lighter than this get partial alpha, to soften JPEG fringing. */
const FEATHER_MIN = 200;

const src = sharp(readFileSync(input)).ensureAlpha();
const { width, height } = await src.metadata();
const raw = await src.raw().toBuffer();

console.log(`input: ${width}x${height}`);

const isLight = (i) =>
  raw[i] >= BACKGROUND_MIN && raw[i + 1] >= BACKGROUND_MIN && raw[i + 2] >= BACKGROUND_MIN;

/* ---- flood fill inward from every border pixel ---- */
const transparent = new Uint8Array(width * height);
const stack = [];

for (let x = 0; x < width; x++) {
  stack.push(x, x + (height - 1) * width);
}
for (let y = 0; y < height; y++) {
  stack.push(y * width, width - 1 + y * width);
}

while (stack.length) {
  const p = stack.pop();
  if (transparent[p]) continue;
  if (!isLight(p * 4)) continue;

  transparent[p] = 1;

  const x = p % width;
  const y = (p / width) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < width - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - width);
  if (y < height - 1) stack.push(p + width);
}

let cleared = 0;
for (let p = 0; p < transparent.length; p++) {
  if (transparent[p]) {
    raw[p * 4 + 3] = 0;
    cleared++;
  }
}
console.log(`background removed: ${((cleared / (width * height)) * 100).toFixed(1)}% of pixels`);

/* ---- feather the boundary ----
   A pixel still opaque but touching transparency, and very light, is
   almost certainly JPEG fringe rather than the product. Fading it stops
   a pale outline appearing once the image sits on navy. */
let feathered = 0;
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
    const min = Math.min(raw[i], raw[i + 1], raw[i + 2]);
    if (min <= FEATHER_MIN) continue;

    // 200 -> stays opaque, 255 -> fully clear.
    const t = (min - FEATHER_MIN) / (255 - FEATHER_MIN);
    raw[i + 3] = Math.round(255 * (1 - t));
    feathered++;
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
