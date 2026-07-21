import { useEffect, useRef, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";

const BUCKET = "widget-photos";

type Payload = { path: string; caption?: string; name?: string };

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return <div className="aspect-square bg-muted rounded-lg animate-pulse" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt="" className="aspect-square w-full object-cover rounded-lg" loading="lazy" />
    </a>
  );
}

export default function EventPhotosWidget({ config }: WidgetProps) {
  const { user } = useSession();
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, remove } = useWidgetItems("event.photos", scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: format non supporté`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${scope.scope_id ?? "user"}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) {
          toast.error(`Échec ${file.name}: ${error.message}`);
          continue;
        }
        await create.mutateAsync({ payload: { path, name: file.name } satisfies Payload });
      }
      toast.success("Photos téléversées");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Photos</CardTitle>
            <CardDescription>Vos photos de l'événement.</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucune photo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((i) => {
              const p = i.payload as Payload;
              return (
                <div key={i.id} className="relative group">
                  <PhotoThumb path={p.path} />
                  <button
                    onClick={() => onDelete(i.id, p.path)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 border-t border-border/40">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
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
