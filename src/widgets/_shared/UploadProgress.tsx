import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export type UploadItemState = {
  id: string;
  name: string;
  size?: number;
  progress: number; // 0..100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export function UploadProgressList({
  items,
  onRetry,
  onDismiss,
}: {
  items: UploadItemState[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5 text-xs">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
          {it.status === "uploading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          {it.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          {it.status === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
          {it.status === "pending" && <Loader2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-50" />}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <span className="truncate">{it.name}</span>
              <span className="text-muted-foreground shrink-0">
                {it.status === "error" ? "Erreur" : `${Math.round(it.progress)}%`}
              </span>
            </div>
            {it.status !== "error" ? (
              <Progress value={it.progress} className="h-1 mt-1" />
            ) : (
              <p className="text-destructive text-[11px] mt-0.5 truncate">{it.error ?? "Échec inconnu"}</p>
            )}
          </div>
          {it.status === "error" && onRetry && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onRetry(it.id)}>
              Réessayer
            </Button>
          )}
          {(it.status === "done" || it.status === "error") && onDismiss && (
            <button
              onClick={() => onDismiss(it.id)}
              className="opacity-60 hover:opacity-100 shrink-0"
              aria-label="Fermer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
