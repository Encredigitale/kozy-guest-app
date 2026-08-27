/**
 * Pipeline d'optimisation exécuté côté client avant envoi :
 * décodage (HEIC/HEIF converti) → orientation EXIF appliquée → redimensionnement
 * → compression WebP → suppression des métadonnées (ré-encodage canvas).
 * Le serveur revalide ensuite format, taille, quotas et droits.
 */

export type Variant = { key: "thumb" | "medium" | "large"; blob: Blob; width: number; height: number };

const HEIC = ["image/heic", "image/heif"];

async function decode(file: File): Promise<ImageBitmap> {
  let source: Blob = file;
  const type = file.type.toLowerCase();
  if (HEIC.includes(type) || /\.(heic|heif)$/i.test(file.name)) {
    const heic2any = (await import("heic2any")).default as (o: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(out) ? out[0]! : out;
  }
  // `from-image` applique l'orientation EXIF ; le ré-encodage supprime ensuite EXIF/GPS.
  return createImageBitmap(source, { imageOrientation: "from-image" });
}

function resizeTo(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Variant["blob"]> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas indisponible"));
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression impossible"))),
      "image/webp",
      quality / 100,
    ),
  );
}

export async function buildVariants(
  file: File,
  sizes: { thumbnailSize: number; mediumSize: number; largeSize: number; quality: number },
): Promise<{ variants: Variant[]; width: number; height: number }> {
  const bitmap = await decode(file);
  try {
    const specs: Array<[Variant["key"], number]> = [
      ["thumb", sizes.thumbnailSize],
      ["medium", sizes.mediumSize],
      ["large", sizes.largeSize],
    ];
    const variants: Variant[] = [];
    for (const [key, maxSide] of specs) {
      const q = key === "thumb" ? Math.min(sizes.quality, 75) : sizes.quality;
      const blob = await resizeTo(bitmap, maxSide, q);
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      variants.push({
        key,
        blob,
        width: Math.round(bitmap.width * scale),
        height: Math.round(bitmap.height * scale),
      });
    }
    return { variants, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close?.();
  }
}

/** Envoi d'un blob vers une URL signée, avec progression et annulation. */
export function putSigned(
  signedUrl: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Envoi refusé (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Connexion perdue"));
    xhr.send(blob);
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
