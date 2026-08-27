import { useEffect, useState } from "react";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ALBUM_RETENTION_OPTIONS,
  DEFAULT_PHOTOS_CONFIG,
  RETENTION_OPTIONS,
  type PhotosConfig,
} from "./config";
import { usePhotosConfig, useSavePhotosConfig } from "./usePhotosConfig";

const FORMATS = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/heic", label: "HEIC" },
  { value: "image/heif", label: "HEIF" },
];

export default function PhotosAdminSettings() {
  const { data, isLoading } = usePhotosConfig();
  const save = useSavePhotosConfig();
  const { data: eventTypes = [] } = useEventTypes();
  const [form, setForm] = useState<PhotosConfig>(DEFAULT_PHOTOS_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const set = <K extends keyof PhotosConfig>(k: K, v: PhotosConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleIn = (k: "eventTypeKeys" | "acceptedFormats", value: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(value) ? f[k].filter((x) => x !== value) : [...f[k], value],
    }));

  const num = (k: keyof PhotosConfig, label: string, min = 1) => (
    <div className="space-y-1" key={String(k)}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        value={String(form[k] as number)}
        onChange={(e) => set(k, Number(e.target.value) as never)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Types d'événements concernés</Label>
        <p className="text-xs text-muted-foreground">Aucune sélection = disponible pour tous les types.</p>
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.eventTypeKeys.includes(t.key)}
                onCheckedChange={() => toggleIn("eventTypeKeys", t.key)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Droits par défaut</Label>
        <div className="space-y-1">
          <Label className="text-xs">Qui peut consulter l'album</Label>
          <Select value={form.viewAudience} onValueChange={(v) => set("viewAudience", v as PhotosConfig["viewAudience"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organizer">Organisateur uniquement</SelectItem>
              <SelectItem value="confirmed">Participants confirmés</SelectItem>
              <SelectItem value="all">Tous les invités</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qui peut publier</Label>
          <Select
            value={form.uploadAudience}
            onValueChange={(v) => set("uploadAudience", v as PhotosConfig["uploadAudience"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organizer">Organisateur uniquement</SelectItem>
              <SelectItem value="confirmed">Participants confirmés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(
          [
            ["allowOrganizerOverride", "L'organisateur peut ajuster ces droits"],
            ["collaborative", "Album collaboratif par défaut"],
            ["showAuthorToGuests", "Afficher l'auteur aux invités"],
            ["allowDownload", "Autoriser le téléchargement"],
            ["keepOriginal", "Conserver les fichiers originaux"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <Label className="text-sm">{label}</Label>
            <Switch checked={form[k]} onCheckedChange={(v) => set(k, v)} />
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Limites</Label>
        <div className="grid grid-cols-2 gap-3">
          {num("maxFileSizeMb", "Taille max par fichier (Mo)")}
          {num("maxPerUpload", "Photos max par envoi")}
          {num("maxPerEvent", "Photos max par événement")}
          {num("uploadsPerMinute", "Envois max par minute")}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Formats acceptés</Label>
          <div className="flex flex-wrap gap-3">
            {FORMATS.map((f) => (
              <label key={f.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.acceptedFormats.includes(f.value)}
                  onCheckedChange={() => toggleIn("acceptedFormats", f.value)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Optimisation</Label>
        <div className="grid grid-cols-2 gap-3">
          {num("thumbnailSize", "Miniature (px)", 100)}
          {num("mediumSize", "Format moyen (px)", 400)}
          {num("largeSize", "Grand format (px)", 800)}
          {num("quality", "Qualité WebP (%)", 40)}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Conservation & confidentialité</Label>
        <div className="space-y-1">
          <Label className="text-xs">Durée de conservation des originaux</Label>
          <Select
            value={String(form.originalRetentionDays)}
            onValueChange={(v) => set("originalRetentionDays", Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Durée de conservation de l'album</Label>
          <Select
            value={String(form.albumRetentionMonths)}
            onValueChange={(v) => set("albumRetentionMonths", Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALBUM_RETENTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {num("signedUrlMinutes", "Validité des liens signés (min)")}
          {num("trashDays", "Corbeille : conservation (jours)")}
        </div>
      </div>

      <Button
        className="rounded-full"
        disabled={save.isPending}
        onClick={() => save.mutate(form, { onSuccess: () => toast.success("Réglages enregistrés") })}
      >
        Enregistrer les réglages
      </Button>
    </div>
  );
}
