import { useCallback, useRef, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { UploadProgressList, type UploadItemState } from "@/widgets/_shared/UploadProgress";
import { uploadWithProgress } from "@/widgets/_shared/uploadWithProgress";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Upload, Download, Trash2, Eye, Loader2, AlertCircle } from "lucide-react";

const BUCKET = "widget-documents";
const MAX_SIZE = 20 * 1024 * 1024;

type Payload = { path: string; name: string; size?: number; type?: string };

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function PreviewDialog({ payload, onClose }: { payload: Payload | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    if (!payload) return;
    setState("loading");
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(payload.path, 3600);
    if (error || !data?.signedUrl) {
      setState("error");
      return;
    }
    setUrl(data.signedUrl);
    setState("ready");
  }, [payload]);

  // Load on open
  useState(() => {
    if (payload) load();
  });

  const isImage = payload?.type?.startsWith("image/");
  const isPdf = payload?.type === "application/pdf" || payload?.name?.toLowerCase().endsWith(".pdf");
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={!!payload} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="text-base truncate pr-8">{payload?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
          {state === "loading" || (canPreview && !url) ? (
            <div className="h-full flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'aperçu…
            </div>
          ) : state === "error" ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" /> Impossible de charger l'aperçu.
            </div>
          ) : !canPreview ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground text-center px-6">
              <FileText className="h-8 w-8 text-muted-foreground" />
              Aperçu non disponible pour ce format.
              <span className="text-xs">Téléchargez le fichier pour l'ouvrir.</span>
            </div>
          ) : isPdf ? (
            <iframe src={url!} className="w-full h-full" title={payload!.name} />
          ) : (
            <div className="h-full grid place-items-center overflow-auto p-4">
              <img src={url!} alt={payload!.name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {url && (
            <Button asChild size="sm" variant="outline">
              <a href={url} download={payload?.name}>
                <Download className="h-3.5 w-3.5" /> Télécharger
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventDocumentsWidget({ config }: WidgetProps) {
  const { user } = useSession();
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, remove } = useWidgetItems("event.documents", scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItemState[]>([]);
  const [preview, setPreview] = useState<Payload | null>(null);

  const updateUpload = (id: string, patch: Partial<UploadItemState>) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const uploadOne = useCallback(
    async (file: File) => {
      if (!user) return;
      const id = crypto.randomUUID();
      setUploads((prev) => [...prev, { id, name: file.name, size: file.size, progress: 0, status: "pending" }]);
      if (file.size > MAX_SIZE) {
        updateUpload(id, { status: "error", error: "Fichier trop volumineux (> 20 Mo)." });
        return;
      }
      try {
        updateUpload(id, { status: "uploading", progress: 0 });
        const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
        const path = `${user.id}/${scope.scope_id ?? "user"}/${id}${ext}`;
        await uploadWithProgress({
          bucket: BUCKET,
          path,
          file,
          contentType: file.type || "application/octet-stream",
          onProgress: (p) => updateUpload(id, { progress: p }),
        });
        await create.mutateAsync({
          payload: { path, name: file.name, size: file.size, type: file.type } satisfies Payload,
        });
        updateUpload(id, { status: "done", progress: 100 });
      } catch (e) {
        updateUpload(id, { status: "error", error: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    },
    [user, scope.scope_id, create],
  );

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    for (const file of Array.from(files)) await uploadOne(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDownload = async (p: Payload) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(p.path, 3600, { download: p.name });
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Téléchargement impossible");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (id: string, path: string) => {
    await supabase.storage.from(BUCKET).remove([path]);
    remove.mutate(id);
  };

  return (
    <>
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>Aperçu intégré des PDF & images.</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Aucun document.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((i) => {
                const p = i.payload as Payload;
                const isPreviewable =
                  p.type?.startsWith("image/") || p.type === "application/pdf" || p.name?.toLowerCase().endsWith(".pdf");
                return (
                  <li key={i.id} className="flex items-center gap-2 group py-1.5 border-b border-border/40 last:border-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <button
                      onClick={() => isPreviewable && setPreview(p)}
                      disabled={!isPreviewable}
                      className="flex-1 min-w-0 text-left disabled:cursor-default"
                    >
                      <p className="text-sm font-medium truncate hover:underline">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(p.size)}</p>
                    </button>
                    {isPreviewable && (
                      <button
                        onClick={() => setPreview(p)}
                        className="opacity-70 hover:opacity-100 transition"
                        aria-label="Aperçu"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => onDownload(p)} className="opacity-70 hover:opacity-100 transition" aria-label="Télécharger">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(i.id, p.path)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <UploadProgressList items={uploads} onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))} />
          <div className="pt-2 border-t border-border/40">
            <Input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <Button onClick={() => inputRef.current?.click()} disabled={!user} size="sm" className="rounded-full">
              <Upload className="h-3.5 w-3.5" /> Téléverser
            </Button>
          </div>
        </CardContent>
      </Card>
      <PreviewDialog payload={preview} onClose={() => setPreview(null)} />
    </>
  );
}
