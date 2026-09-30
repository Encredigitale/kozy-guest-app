import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SEARCH_SOURCES } from "@/core/search/registry";
import {
  DEFAULT_SEARCH_SETTINGS,
  SEARCH_SETTINGS_KEY,
  normalizeSearchSettings,
  type SearchSettings,
  type SearchSourceId,
} from "@/core/search/types";

export const Route = createFileRoute("/_authenticated/app/admin/search")({
  head: () => ({
    meta: [
      { title: "Recherche — Administration Ma Belle Table" },
      { name: "description", content: "Configurer le plugin Recherche globale de Ma Belle Table." },
      { property: "og:title", content: "Recherche — Administration Ma Belle Table" },
      { property: "og:description", content: "Configurer le plugin Recherche globale de Ma Belle Table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSearchPage,
});

function AdminSearchPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["search", "settings", "admin"],
    queryFn: async (): Promise<SearchSettings> => {
      const { data } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", SEARCH_SETTINGS_KEY)
        .maybeSingle();
      return data
        ? normalizeSearchSettings((data as { settings?: unknown }).settings)
        : DEFAULT_SEARCH_SETTINGS;
    },
  });

  const [form, setForm] = useState<SearchSettings>(DEFAULT_SEARCH_SETTINGS);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSource = (id: SearchSourceId, on: boolean) =>
    setForm((f) => ({
      ...f,
      disabledSources: on
        ? f.disabledSources.filter((s) => s !== id)
        : Array.from(new Set([...f.disabledSources, id])),
    }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("invitation_settings")
      .upsert({ key: SEARCH_SETTINGS_KEY, settings: form as never }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Réglages de la recherche enregistrés.");
    qc.invalidateQueries({ queryKey: ["search"] });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-4 sm:px-6">
      <Link
        to="/app/admin"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Administration
      </Link>
      <h1 className="font-serif text-2xl text-primary">Recherche</h1>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">Général</h2>
          <Row label="Plugin actif">
            <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </Row>
          <Row label="Recherche globale">
            <Switch checked={form.globalEnabled} onCheckedChange={(v) => set("globalEnabled", v)} />
          </Row>
          <Row label="Recherche dans un événement">
            <Switch checked={form.eventEnabled} onCheckedChange={(v) => set("eventEnabled", v)} />
          </Row>
          <Row label="Recherches récentes">
            <Switch checked={form.recentEnabled} onCheckedChange={(v) => set("recentEnabled", v)} />
          </Row>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">Résultats & recherche</h2>
          <NumberField
            label="Résultats par catégorie"
            value={form.perCategory}
            onChange={(v) => set("perCategory", v)}
          />
          <NumberField
            label="Nombre maximum de résultats"
            value={form.maxResults}
            onChange={(v) => set("maxResults", v)}
          />
          <NumberField
            label="Nombre minimum de caractères"
            value={form.minChars}
            onChange={(v) => set("minChars", v)}
          />
          <Row label="Tolérance aux fautes">
            <Switch checked={form.fuzzy} onCheckedChange={(v) => set("fuzzy", v)} />
          </Row>
          <NumberField
            label="Conservation de l'historique (jours)"
            value={form.recentRetentionDays}
            onChange={(v) => set("recentRetentionDays", v)}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Sources de recherche</h2>
          <p className="text-xs text-muted-foreground">
            Désactiver une source la retire des résultats et des filtres, sans supprimer les données
            ni désactiver le plugin correspondant.
          </p>
          {SEARCH_SOURCES.map((s) => (
            <Row key={s.id} label={s.label}>
              <Switch
                checked={!form.disabledSources.includes(s.id)}
                onCheckedChange={(v) => toggleSource(s.id, v)}
              />
            </Row>
          ))}
        </CardContent>
      </Card>

      <Button className="h-12 w-full rounded-full" disabled={saving} onClick={save}>
        Enregistrer
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label className="text-sm font-normal">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label className="text-sm font-normal">{label}</Label>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
        className="h-11 w-24 rounded-xl"
      />
    </div>
  );
}
