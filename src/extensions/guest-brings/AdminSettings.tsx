import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DEFAULT_GUEST_BRINGS_CONFIG, type GuestBringsConfig } from "./config";
import { useContributionCatalog, useGuestBringsConfig, useSaveGuestBringsConfig } from "./useGuestBrings";
import { ContributionIcon } from "./icons";

export default function GuestBringsAdminSettings() {
  const { data, isLoading } = useGuestBringsConfig();
  const save = useSaveGuestBringsConfig();
  const { data: eventTypes = [] } = useEventTypes();
  const { data: catalog } = useContributionCatalog();
  const [form, setForm] = useState<GuestBringsConfig>(DEFAULT_GUEST_BRINGS_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const set = <K extends keyof GuestBringsConfig>(key: K, value: GuestBringsConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleEventType = (key: string) =>
    setForm((f) => ({
      ...f,
      eventTypeKeys: f.eventTypeKeys.includes(key)
        ? f.eventTypeKeys.filter((k) => k !== key)
        : [...f.eventTypeKeys, key],
    }));

  const rows: { label: string; description?: string; key: keyof GuestBringsConfig }[] = [
    { label: "Plusieurs apports autorisés", key: "multiple", description: "Recommandé : l'invité peut apporter plusieurs choses." },
    { label: "Quantité", key: "quantityEnabled" },
    { label: "Précision (note)", key: "notesEnabled" },
    { label: "Saisie libre autorisée", key: "freeTextEnabled" },
    { label: "Rappels J-1", key: "remindersEnabled" },
    { label: "Notifier l'organisateur", key: "notifyOrganizer" },
    { label: "Suggestions depuis Menu / Thème", key: "useMenuContext" },
    { label: "Indiquer les doublons", key: "showDuplicateHint", description: "« 2 personnes apportent déjà du vin »." },
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
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Catégories proposées ({catalog?.types.filter((t) => t.active).length ?? 0} actives)
        </Label>
        <div className="flex flex-wrap gap-2">
          {(catalog?.types ?? []).map((t) => (
            <span
              key={t.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                t.active ? "border-border" : "border-dashed text-muted-foreground"
              }`}
            >
              <ContributionIcon name={t.icon} className="h-3.5 w-3.5" />
              {t.label}
            </span>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/app/admin/contribution-types">Gérer les types d'apports</Link>
        </Button>
      </div>

      <Button
        className="rounded-full"
        disabled={save.isPending}
        onClick={() =>
          save.mutate(form, {
            onSuccess: () => toast.success("Configuration enregistrée"),
            onError: (error) => toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement"),
          })
        }
      >
        Enregistrer la configuration
      </Button>
    </div>
  );
}
