"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ImagePlus,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Star,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductImageUploaderProps {
  /** Current gallery. images[0] is the one shown on cards. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Upload product photographs, straight from the browser to Cloudinary.
 *
 * THE FILE DOES NOT PASS THROUGH OUR SERVER. It asks
 * /api/upload/signature for a short-lived signature, then POSTs the file
 * directly to Cloudinary. A 4 MB photograph never touches a serverless
 * function's request body, and the API secret never leaves the server.
 *
 * ORDER MATTERS, which is why there are arrows. images[0] is what every
 * product card, the POS tile and the storefront gallery show first, so
 * "make this the main photo" is a real operation and not decoration.
 *
 * NOT CONFIGURED IS A SUPPORTED STATE. Until the Cloudinary keys exist
 * the signature endpoint answers 503, and this says so plainly rather
 * than failing in a way that looks like a bug.
 */

/** Refuse obvious mistakes before spending a round trip on them. */
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ProductImageUploader({ value, onChange }: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  async function uploadOne(file: File): Promise<string | null> {
    const signRes = await fetch("/api/upload/signature", { method: "POST" });

    if (signRes.status === 503) {
      setNotConfigured(true);
      return null;
    }
    if (!signRes.ok) throw new Error("signature");

    const { signature, timestamp, folder, apiKey, cloudName } = await signRes.json();

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: form }
    );

    if (!upload.ok) throw new Error("upload");

    const data = await upload.json();
    // secure_url, never url - an http image on an https page is blocked
    // by the browser as mixed content.
    return typeof data.secure_url === "string" ? data.secure_url : null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const chosen = Array.from(files);
    const tooBig = chosen.filter((f) => f.size > MAX_BYTES);
    const wrongType = chosen.filter((f) => !ACCEPTED.includes(f.type));

    if (tooBig.length) {
      toast.error("That image is too large.", {
        description: `${tooBig[0].name} is over 10 MB. Photos from a phone are usually well under that.`,
      });
      return;
    }
    if (wrongType.length) {
      toast.error("That file is not an image.", {
        description: "Use a JPG, PNG, WebP or AVIF.",
      });
      return;
    }

    setBusy(true);
    const uploaded: string[] = [];

    try {
      for (const file of chosen) {
        const url = await uploadOne(file);
        if (url) uploaded.push(url);
      }

      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
        toast.success(
          uploaded.length === 1 ? "Photo added." : `${uploaded.length} photos added.`
        );
      }
    } catch {
      toast.error("Upload failed.", {
        description: "Check the connection and try again.",
      });
    } finally {
      setBusy(false);
      // Clear the input, otherwise picking the SAME file again fires no
      // change event and looks broken.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          id="product-images"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-10 gap-1.5 text-sm"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="size-4" aria-hidden="true" />
              Add photos
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          JPG, PNG or WebP, up to 10 MB each.
        </span>
      </div>

      {notConfigured && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          Image upload is not set up yet. It needs a Cloudinary cloud name, API
          key and API secret in the environment. Until then, the storefront shows
          the branded placeholder tile.
        </p>
      )}

      {value.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((url, index) => (
              <li
                key={url}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-muted",
                  index === 0 ? "border-secondary" : "border-border"
                )}
              >
                <div className="relative aspect-square">
                  <Image
                    src={url}
                    alt={`Product photo ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>

                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Star className="size-3" aria-hidden="true" />
                    Main
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-destructive"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>

                <div className="flex items-center justify-between gap-1 border-t border-border bg-card px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move photo ${index + 1} earlier`}
                    className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {index + 1} / {value.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label={`Move photo ${index + 1} later`}
                    className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-muted-foreground">
            The first photo is the one shown on product cards and at the counter.
            Use the arrows to change which that is.
          </p>
        </>
      )}
    </div>
  );
}
