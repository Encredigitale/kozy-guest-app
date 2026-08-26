import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  DEFAULT_CONTRIBUTIONS_CONFIG,
  NEED_TYPES,
  NEED_TYPE_LABELS,
  type ContributionsConfig,
  type NeedType,
} from "./config";
import { useContributionsConfig, useSaveContributionsConfig } from "./useContributions";

export default function ContributionsAdminSettings() {
  const { data, isLoading } = useContributionsConfig();
  const save = useSaveContributionsConfig();
  const { data: eventTypes = [] } = useEventTypes();
  const [form, setForm] = useState<ContributionsConfig>(DEFAULT_CONTRIBUTIONS_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const set = <K extends keyof ContributionsConfig>(key: K, value: ContributionsConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleEventType = (key: string) =>
    setForm((f) => {
      const list = new Set(f.eventTypeKeys);
      if (list.has(key)) list.delete(key);
      else list.add(key);
      return { ...f, eventTypeKeys: Array.from(list) };
    });

  const toggleNeedType = (t: NeedType) =>
    setForm((f) => {
      const list = new Set(f.needTypes);
      if (list.has(t)) list.delete(t);
      else list.add(t);
      return { ...f, needTypes: Array.from(list) as NeedType[] };
    });

  const switches: { label: string; description?: string; key: keyof ContributionsConfig }[] = [
    {
      label: "Engagements multiples",
      key: "allowMultipleCommitments",
      description: "Un invité peut contribuer à plusieurs besoins.",
    },
    {
      label: "Dépassement autorisé par défaut",
      key: "allowOvercommitmentDefault",
      description: "Valeur proposée à la création d'un besoin.",
    },
    { label: "Modification des engagements", key: "allowGuestEdit" },
    { label: "Priorités", key: "prioritiesEnabled" },
    { label: "Rappels", key: "remindersEnabled" },
    { label: "Notifier l'organisateur", key: "notifyOrganizer" },
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

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Types de besoins autorisés</Label>
        <div className="grid grid-cols-2 gap-2">
          {NEED_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.needTypes.includes(t)} onCheckedChange={() => toggleNeedType(t)} />
              {NEED_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {switches.map((s) => (
          <div key={String(s.key)} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm">{s.label}</p>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            </div>
            <Switch checked={Boolean(form[s.key])} onCheckedChange={(v) => set(s.key, v as never)} />
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Visibilité des participants</Label>
          <Select
            value={form.participantVisibility}
            onValueChange={(v) => set("participantVisibility", v as ContributionsConfig["participantVisibility"])}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transparent">Transparent (qui apporte quoi)</SelectItem>
              <SelectItem value="discreet">Discret (totaux seulement)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordre d'affichage</Label>
          <Select
            value={form.displayOrder}
            onValueChange={(v) => set("displayOrder", v as ContributionsConfig["displayOrder"])}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coverage">Besoins non couverts d'abord</SelectItem>
              <SelectItem value="priority">Par priorité</SelectItem>
              <SelectItem value="created">Par date de création</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Libellé du bouton invité</Label>
          <Input
            className="rounded-2xl"
            value={form.ctaLabel}
            maxLength={40}
            onChange={(e) => set("ctaLabel", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/app/admin/contributions">Référentiels (catégories, unités, suggestions)</Link>
        </Button>
      </div>
    </div>
  );
}
