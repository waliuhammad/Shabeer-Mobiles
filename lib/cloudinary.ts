import "server-only";

import { createHash } from "node:crypto";

/**
 * Cloudinary, for product photographs.
 *
 * WHY SIGNED UPLOADS AND NOT AN UNSIGNED PRESET
 * ---------------------------------------------
 * An unsigned preset is a public write endpoint. Anyone who reads the
 * cloud name out of the page source - which they can, it is in every
 * image URL - can upload whatever they like into the shop's media
 * library, and there is no way to withdraw that beyond deleting the
 * preset.
 *
 * A signed upload requires a signature that only the API secret can
 * produce. The secret stays on the server, the browser gets a signature
 * that is good for one upload into one folder, and the route that issues
 * it checks first that the caller is signed-in staff. Same reasoning as
 * app/api/sales/route.ts: the trusted work happens on the server.
 *
 * WHAT IS NOT HERE: the delete path. Removing a photo from a product
 * detaches it from the catalogue but leaves the file in Cloudinary. That
 * is deliberate for now - a destructive call needs its own thinking
 * about who may make it, and an orphaned image costs a fraction of a
 * credit, where a wrongly-authorised delete costs the photograph.
 */

/** Where this shop's images live, so the folder is never a caller's choice. */
export const CLOUDINARY_FOLDER = "shabbir-mobiles/products";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Reads the three values, or null when any is missing.
 *
 * Returning null rather than throwing lets the admin UI say "image
 * upload is not set up yet" instead of the page crashing - which is the
 * state the project is in until the keys arrive.
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

/**
 * Signs an upload.
 *
 * Cloudinary's rule: take every parameter that will be sent EXCEPT the
 * file, the api_key and the signature itself; sort them by key; join as
 * key=value with &; append the API secret; SHA-1 the result.
 *
 * The parameters signed here are the only ones the upload may carry. A
 * browser that tries to add its own folder, or a public_id of its
 * choosing, produces a request whose signature no longer matches and
 * Cloudinary rejects it.
 */
export function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}
