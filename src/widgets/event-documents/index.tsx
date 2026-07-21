import { useRef, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Upload, Download, Trash2 } from "lucide-react";

const BUCKET = "widget-documents";

type Payload = { path: string; name: string; size?: number; type?: string };

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function EventDocumentsWidget({ config }: WidgetProps) {
  const { user } = useSession();
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, remove } = useWidgetItems("event.documents", scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
        const path = `${user.id}/${scope.scope_id ?? "user"}/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) {
          toast.error(`Échec ${file.name}: ${error.message}`);
          continue;
        }
        await create.mutateAsync({
          payload: { path, name: file.name, size: file.size, type: file.type } satisfies Payload,
        });
      }
      toast.success("Documents téléversés");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDownload = async (p: Payload) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(p.path, 3600, {
      download: p.name,
    });
    if (error || !data?.signedUrl) {
      toast.error("Téléchargement impossible");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (id: string, path: string) => {
    await supabase.storage.from(BUCKET).remove([path]);
    remove.mutate(id);
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>Pièces jointes de l'événement.</CardDescription>
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
              return (
                <li key={i.id} className="flex items-center gap-2 group py-1.5 border-b border-border/40 last:border-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(p.size)}</p>
                  </div>
                  <button
                    onClick={() => onDownload(p)}
                    className="opacity-70 hover:opacity-100 transition"
                    aria-label="Télécharger"
                  >
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
        <div className="pt-2 border-t border-border/40">
          <Input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !user}
            size="sm"
            className="rounded-full"
          >
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Téléversement…" : "Téléverser"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
