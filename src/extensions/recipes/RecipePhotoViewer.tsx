import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut } from "lucide-react";

/** Visionneuse plein écran : zoom et déplacement, sans autre traitement. */
export function RecipePhotoViewer({
  url,
  open,
  onOpenChange,
}: {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-none w-screen h-[100dvh] p-0 border-0 bg-popup/95 rounded-none [&>button]:hidden"
        aria-describedby={undefined}
      >
        <div className="relative h-full w-full overflow-hidden touch-none">
          {url && (
            <img
              src={url}
              alt="Photo de la recette"
              draggable={false}
              className="absolute inset-0 m-auto max-h-full max-w-full select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? "grab" : "zoom-in",
                transition: drag.current ? "none" : "transform 120ms ease-out",
              }}
              onDoubleClick={() => (zoom > 1 ? reset() : setZoom(2.5))}
              onPointerDown={(e) => {
                if (zoom === 1) return;
                drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            />
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              aria-label="Agrandir"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                setZoom((z) => {
                  const next = Math.max(1, z - 0.5);
                  if (next === 1) setOffset({ x: 0, y: 0 });
                  return next;
                });
              }}
              aria-label="Réduire"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
