import { useEffect, useState } from "react";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DEFAULT_GIFTS_CONFIG,
  GIFT_VISIBILITY_LABELS,
  type GiftVisibility,
  type GiftsConfig,
} from "./config";
import { useGiftsConfig, useSaveGiftsConfig } from "./useGifts";

export default function GiftsAdminSettings() {
  const { data, isLoading } = useGiftsConfig();
  const save = useSaveGiftsConfig();
  const { data: eventTypes = [] } = useEventTypes();
  const [form, setForm] = useState<GiftsConfig>(DEFAULT_GIFTS_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const set = <K extends keyof GiftsConfig>(key: K, value: GiftsConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleEventType = (key: string) =>
    setForm((f) => ({
      ...f,
      eventTypeKeys: f.eventTypeKeys.includes(key)
        ? f.eventTypeKeys.filter((k) => k !== key)
        : [...f.eventTypeKeys, key],
    }));

  const rows: { label: string; description?: string; key: keyof GiftsConfig }[] = [
    { label: "Photo autorisée", key: "photoEnabled", description: "Utilise le service d'images du plugin Photos." },
    { label: "Plusieurs destinataires", key: "multipleRecipients" },
    { label: "Plusieurs personnes « Par »", key: "multipleGivers" },
    { label: "Saisie libre autorisée", key: "freeTextEnabled" },
    { label: "Utiliser le carnet d'adresses", key: "useContactsBook" },
    { label: "Afficher dans « Mes moments »", key: "showInMemories" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Types d'événements concernés</Label>
        <p className="text-xs text-muted-foreground">Aucune sélection = disponible pour tous les types.</p>
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.eventTypeKeys.includes(t.key)} onCheckedChange={() => toggleEventType(t.key)} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={String(r.key)} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm">{r.label}</p>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
            </div>
            <Switch checked={Boolean(form[r.key])} onCheckedChange={(v) => set(r.key, v as never)} />
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visibilité par défaut</Label>
        <Select value={form.defaultVisibility} onValueChange={(v) => set("defaultVisibility", v as GiftVisibility)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(GIFT_VISIBILITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="rounded-full"
        disabled={save.isPending}
        onClick={() => save.mutate(form, { onSuccess: () => toast.success("Paramètres enregistrés") })}
      >
        Enregistrer
      </Button>
    </div>
  );
}
