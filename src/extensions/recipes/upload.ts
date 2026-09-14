import { buildVariants, putSigned } from "@/extensions/photos/pipeline";
import type { RecipesConfig } from "./config";

export type PendingPhoto = { path: string; width: number; height: number; preview: string };

/**
 * Optimisation côté client (orientation EXIF appliquée, WebP, métadonnées retirées)
 * puis envoi vers l'emplacement signé fourni par le serveur.
 */
export async function uploadRecipePhoto(
  eventId: string,
  file: File,
  config: RecipesConfig,
): Promise<PendingPhoto> {
  const { createRecipePhotoUpload } = await import("@/lib/recipes.functions");
  const { variants, width, height } = await buildVariants(file, {
    thumbnailSize: config.imageSize,
    mediumSize: config.imageSize,
    largeSize: config.imageSize,
    quality: config.quality,
  });
  const large = variants.find((v) => v.key === "large") ?? variants[variants.length - 1]!;

  const slot = (await createRecipePhotoUpload({
    data: { eventId, mimeType: "image/webp", originalSize: file.size },
  })) as { ok: boolean; error?: string; path?: string; uploadUrl?: string };
  if (!slot.ok || !slot.uploadUrl || !slot.path) {
    throw new Error(
      slot.error === "too_large"
        ? "Photo trop lourde."
        : slot.error === "forbidden"
          ? "Action réservée à l'organisateur."
          : "Envoi impossible pour le moment.",
    );
  }

  await putSigned(slot.uploadUrl, large.blob, "image/webp");
  return {
    path: slot.path,
    width: large.width || width,
    height: large.height || height,
    preview: URL.createObjectURL(large.blob),
  };
}
