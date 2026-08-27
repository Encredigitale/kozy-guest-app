import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { PhotoItem } from "./public-types";

/** Recadrage 16:9 de la photo de couverture : on ne stocke que les coordonnées. */
export default function CoverCropDialog({
  photo,
  open,
  onOpenChange,
  getAsset,
  onValidate,
}: {
  photo: PhotoItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  getAsset: (photoId: string, size: "medium") => Promise<{ ok: boolean; url?: string }>;
  onValidate: (crop: { cropX: number; cropY: number; cropWidth: number; cropHeight: number }) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [offset, setOffset] = useState(50);

  useEffect(() => {
    setUrl(null);
    setOffset(50);
    if (!photo || !open) return;
    let active = true;
    getAsset(photo.id, "medium").then((r) => {
      if (active && r.ok && r.url) setUrl(r.url);
    });
    return () => {
      active = false;
    };
  }, [photo, open, getAsset]);

  if (!photo) return null;

  const ratio = photo.height > 0 ? photo.width / photo.height : 1;
  const cropHeight = Math.min(1, ratio / (16 / 9));
  const cropY = ((100 - offset) / 100) * 0 + (offset / 100) * (1 - cropHeight);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Définir comme couverture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "16 / 9" }}>
            {url && (
              <img
                src={url}
                alt={photo.description ?? "Photo de l'événement"}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: `50% ${offset}%` }}
              />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Déplacez pour recentrer l'image.</p>
            <Slider
              value={[offset]}
              onValueChange={(v) => setOffset(v[0] ?? 50)}
              min={0}
              max={100}
              step={1}
              aria-label="Position verticale du cadrage"
            />
          </div>
          <Button
            className="rounded-full w-full"
            onClick={() => onValidate({ cropX: 0, cropY, cropWidth: 1, cropHeight })}
          >
            Valider le cadrage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
