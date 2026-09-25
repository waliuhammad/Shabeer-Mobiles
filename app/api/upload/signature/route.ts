import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import {
  CLOUDINARY_FOLDER,
  getCloudinaryConfig,
  signUploadParams,
} from "@/lib/cloudinary";

/**
 * POST /api/upload/signature - issue a one-shot Cloudinary upload
 * signature to signed-in staff.
 *
 * THE BROWSER NEVER SEES THE API SECRET. It receives a signature, a
 * timestamp and the folder, uploads the file straight to Cloudinary, and
 * gets back a URL. The file itself never passes through this server,
 * which keeps a 4 MB photograph off the serverless function's request
 * body and its memory.
 *
 * WHO MAY CALL IT: staff only, checked with verifySession() - the same
 * Data Access Layer that guards every admin page. Without that, the
 * endpoint would be an open door to the shop's media library for anyone
 * who found the URL, which is exactly the problem signed uploads exist
 * to solve.
 *
 * The signed parameters pin the FOLDER. A caller cannot redirect the
 * upload elsewhere in the account, because changing any signed value
 * invalidates the signature.
 */
export async function POST() {
  const user = await verifySession();
  if (!user?.isStaff) {
    // 404, not 403: an endpoint that answers "forbidden" confirms it
    // exists and is worth attacking.
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const config = getCloudinaryConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: "not-configured",
        message:
          "Cloudinary keys are not set. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      },
      { status: 503 }
    );
  }

  // Cloudinary rejects a timestamp more than an hour out, which caps how
  // long a leaked signature stays useful.
  const timestamp = Math.round(Date.now() / 1000);

  const params = {
    folder: CLOUDINARY_FOLDER,
    timestamp,
  };

  return NextResponse.json({
    signature: signUploadParams(params, config.apiSecret),
    timestamp,
    folder: CLOUDINARY_FOLDER,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
  });
}
