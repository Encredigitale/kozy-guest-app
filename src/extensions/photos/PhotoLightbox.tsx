import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Flag, Loader2, MoreHorizontal, X } from "lucide-react";
import type { PhotoAccess, PhotoItem } from "./public-types";
import { REPORT_REASONS } from "./config";

type Props = {
  photos: PhotoItem[];
  index: number;
  access: PhotoAccess;
  onClose: () => void;
  onIndex: (i: number) => void;
  getAsset: (photoId: string, size: "medium" | "large" | "original") => Promise<{ ok: boolean; url?: string }>;
  onReport: (v: { photoId: string; reason: string; comment?: string }) => Promise<unknown>;
  onNeedMore: () => void;
};

export default function PhotoLightbox({
  photos,
  index,
  access,
  onClose,
  onIndex,
  getAsset,
  onReport,
  onNeedMore,
}: Props) {
  const photo = photos[index];
  const [url, setUrl] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].value as string);
  const [comment, setComment] = useState("");
  const [touchX, setTouchX] = useState<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      onIndex(next);
      if (next >= photos.length - 3) onNeedMore();
    },
    [index, onIndex, onNeedMore, photos.length],
  );

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!photo) return;
    getAsset(photo.id, "large").then((r) => {
      if (active && r.ok && r.url) setUrl(r.url);
    });
    return () => {
      active = false;
    };
  }, [photo, getAsset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!photo || typeof document === "undefined") return null;

  const submitReport = async () => {
    await onReport({ photoId: photo.id, reason, comment: comment.trim() || undefined });
    setReporting(false);
    setMenu(false);
    setComment("");
    toast.success("Merci. Votre signalement a été transmis à l'organisateur.");
  };

  const download = async () => {
    const r = await getAsset(photo.id, "original");
    if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
    else toast.error("Téléchargement indisponible.");
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      className="fixed inset-0 z-[100] bg-background/98 backdrop-blur flex flex-col"
      onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="flex items-center justify-between p-3">
        <p className="text-xs text-muted-foreground">
          {index + 1} / {photos.length}
        </p>
        <div className="flex items-center gap-1">
          {access.allowDownload && (
            <Button variant="ghost" size="icon" onClick={download} aria-label="Télécharger la photo">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setMenu((m) => !m)} aria-label="Plus d'options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer la visionneuse">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {menu && !reporting && (
        <div className="absolute right-3 top-14 z-10 rounded-xl border bg-card p-1 shadow-lg">
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted w-full"
            onClick={() => setReporting(true)}
          >
            <Flag className="h-3.5 w-3.5" /> Signaler cette photo
          </button>
        </div>
      )}

      <div className="relative flex-1 grid place-items-center px-2 min-h-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 rounded-full"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {url ? (
          <img
            src={url}
            alt={photo.description ?? "Photo de l'événement"}
            className="max-h-full max-w-full object-contain rounded-xl"
          />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 rounded-full"
          onClick={() => go(1)}
          disabled={index >= photos.length - 1}
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {photo.description && <p className="text-sm">{photo.description}</p>}
        <p className="text-xs text-muted-foreground">
          {photo.authorLabel ? `Ajoutée par ${photo.authorLabel} · ` : ""}
          {new Date(photo.createdAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}
        </p>

        {reporting && (
          <div className="space-y-2 rounded-2xl border p-3">
            <p className="text-sm font-medium">Signaler cette photo</p>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger aria-label="Motif du signalement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire (facultatif)"
              aria-label="Commentaire"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setReporting(false)}>
                Annuler
              </Button>
              <Button size="sm" className="rounded-full" onClick={submitReport}>
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
