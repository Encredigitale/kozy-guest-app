import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems, scopeFromEventId, type WidgetItem } from "@/widgets/_shared/useWidgetItems";
import { UploadProgressList, type UploadItemState } from "@/widgets/_shared/UploadProgress";
import { uploadWithProgress, generateThumbnail } from "@/widgets/_shared/uploadWithProgress";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, Star, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BUCKET = "widget-photos";
const MAX_SIZE = 20 * 1024 * 1024;

type Payload = { path: string; thumb_path?: string; caption?: string; name?: string; is_cover?: boolean };

function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}

function SortablePhoto({
  item,
  onDelete,
  onSetCover,
  isCover,
}: {
  item: WidgetItem;
  onDelete: () => void;
  onSetCover: () => void;
  isCover: boolean;
}) {
  const p = item.payload as Payload;
  const url = useSignedUrl(p.thumb_path ?? p.path);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {url ? (
        <img src={url} alt={p.caption ?? ""} className="aspect-square w-full object-cover rounded-lg" loading="lazy" />
      ) : (
        <div className="aspect-square bg-muted rounded-lg animate-pulse" />
      )}
      {isCover && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Star className="h-2.5 w-2.5 fill-current" /> Couverture
        </div>
      )}
      <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 group-hover:opacity-100 transition">
        <button
          {...attributes}
          {...listeners}
          className="h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center cursor-grab active:cursor-grabbing"
          aria-label="Réorganiser"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="flex gap-1">
          <button
            onClick={onSetCover}
            className="h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center"
            aria-label="Définir comme couverture"
          >
            <Star className={`h-3 w-3 ${isCover ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center"
            aria-label="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventPhotosWidget({ config }: WidgetProps) {
  const { user } = useSession();
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, update, remove } = useWidgetItems("event.photos", scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItemState[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sorted = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const coverId = useMemo(() => sorted.find((i) => (i.payload as Payload).is_cover)?.id, [sorted]);

  const updateUpload = (id: string, patch: Partial<UploadItemState>) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const uploadOne = useCallback(
    async (file: File) => {
      if (!user) return;
      const id = crypto.randomUUID();
      setUploads((prev) => [...prev, { id, name: file.name, size: file.size, progress: 0, status: "pending" }]);

      if (!file.type.startsWith("image/")) {
        updateUpload(id, { status: "error", error: "Format non supporté (image requise)." });
        return;
      }
      if (file.size > MAX_SIZE) {
        updateUpload(id, { status: "error", error: "Fichier trop volumineux (> 20 Mo)." });
        return;
      }

      try {
        updateUpload(id, { status: "uploading", progress: 0 });
        const ext = file.name.split(".").pop() ?? "jpg";
        const base = `${user.id}/${scope.scope_id ?? "user"}/${id}`;
        const path = `${base}.${ext}`;
        await uploadWithProgress({
          bucket: BUCKET,
          path,
          file,
          contentType: file.type,
          onProgress: (p) => updateUpload(id, { progress: p * 0.85 }),
        });

        // Generate + upload thumbnail (best-effort — non-blocking)
        let thumb_path: string | undefined;
        const thumb = await generateThumbnail(file, 400, 0.8);
        if (thumb) {
          thumb_path = `${base}.thumb.jpg`;
          try {
            await uploadWithProgress({
              bucket: BUCKET,
              path: thumb_path,
              file: thumb,
              contentType: "image/jpeg",
              onProgress: (p) => updateUpload(id, { progress: 85 + p * 0.15 }),
            });
          } catch {
            thumb_path = undefined;
          }
        }

        await create.mutateAsync({
          payload: { path, thumb_path, name: file.name } satisfies Payload,
          position: items.length,
        });
        updateUpload(id, { status: "done", progress: 100 });
      } catch (e) {
        updateUpload(id, { status: "error", error: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    },
    [user, scope.scope_id, create, items.length],
  );

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    for (const file of Array.from(files)) await uploadOne(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDelete = async (id: string, p: Payload) => {
    const toDelete = [p.path, p.thumb_path].filter(Boolean) as string[];
    if (toDelete.length) await supabase.storage.from(BUCKET).remove(toDelete);
    remove.mutate(id);
  };

  const onSetCover = async (id: string) => {
    // clear previous cover
    for (const it of items) {
      const p = it.payload as Payload;
      if (p.is_cover && it.id !== id) {
        await update.mutateAsync({ id: it.id, patch: { payload: { ...p, is_cover: false } } });
      }
    }
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const p = target.payload as Payload;
    await update.mutateAsync({ id, patch: { payload: { ...p, is_cover: true } } });
    toast.success("Couverture définie");
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((i) => i.id === active.id);
    const newIndex = sorted.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    // Persist new positions in parallel
    await Promise.all(
      reordered.map((it, idx) =>
        it.position !== idx ? update.mutateAsync({ id: it.id, patch: { position: idx } }) : Promise.resolve(),
      ),
    );
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
            <CardDescription>Glissez pour réorganiser · ⭐ pour définir la couverture.</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucune photo pour le moment.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sorted.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-2">
                {sorted.map((i) => (
                  <SortablePhoto
                    key={i.id}
                    item={i}
                    isCover={i.id === coverId}
                    onDelete={() => onDelete(i.id, i.payload as Payload)}
                    onSetCover={() => onSetCover(i.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <UploadProgressList
          items={uploads}
          onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
          onRetry={() => toast.info("Ré-uploadez le fichier via le sélecteur.")}
        />
        <div className="pt-2 border-t border-border/40">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={!user} size="sm" className="rounded-full">
            <Upload className="h-3.5 w-3.5" /> Téléverser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
