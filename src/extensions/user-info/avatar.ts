/** Optimisation d'avatar : recadrage carré centré + WebP 256/512 px. */

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export function checkAvatarFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
    return "Format d'image non pris en charge.";
  }
  if (file.size > MAX_AVATAR_BYTES) return "Image trop volumineuse (10 Mo maximum).";
  return null;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Lecture de l'image impossible"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function renderSquare(
  source: ImageBitmap | HTMLImageElement,
  size: number,
): Promise<Blob> {
  const w = "width" in source ? source.width : 0;
  const h = "height" in source ? source.height : 0;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(source as CanvasImageSource, sx, sy, side, side, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversion impossible"))),
      "image/webp",
      0.85,
    ),
  );
}

export type AvatarVariants = { small: Blob; large: Blob };

/** Ne jamais téléverser l'original : uniquement des variantes légères. */
export async function buildAvatarVariants(file: File): Promise<AvatarVariants> {
  const bitmap = await loadBitmap(file);
  const [small, large] = await Promise.all([renderSquare(bitmap, 256), renderSquare(bitmap, 512)]);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  return { small, large };
}
