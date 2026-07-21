import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to Supabase Storage while reporting progress.
 * Uses a signed upload URL + XHR because supabase-js does not expose an
 * `onUploadProgress` hook.
 */
export async function uploadWithProgress(params: {
  bucket: string;
  path: string;
  file: Blob;
  contentType?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { bucket, path, file, contentType, onProgress, signal } = params;

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (signedError || !signed) {
    throw new Error(signedError?.message ?? "Impossible d'initialiser l'upload.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signedUrl, true);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload échoué (${xhr.status}): ${xhr.responseText?.slice(0, 120)}`));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi."));
    xhr.onabort = () => reject(new DOMException("Upload annulé", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/**
 * Generate a JPEG thumbnail (max side `maxSide`) from an image file
 * using the Canvas API. Returns a Blob or null if the image cannot be read.
 */
export async function generateThumbnail(file: File, maxSide = 400, quality = 0.8): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
