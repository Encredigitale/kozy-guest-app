import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllWidgets, applyWidgetConfigs } from "@/core/widgets";
import type { WidgetDefinition, WidgetSurface } from "@/core/widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, ShieldAlert } from "lucide-react";
import { EVENT_TYPES } from "@/lib/event-types";

type Row = {
  widget_id: string;
  enabled: boolean;
  display_order: number;
  event_types: string[] | null;
};

const SURFACES: { key: WidgetSurface; label: string }[] = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "event.new", label: "Création d'événement" },
  { key: "event.detail", label: "Détail d'événement" },
  { key: "contact.detail", label: "Détail contact" },
];

export function AdminWidgetsWidget() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});

  const defs = useMemo(() => getAllWidgets(), []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from("widget_configs")
        .select("widget_id, enabled, display_order, event_types");
      if (error) {
        toast.error("Chargement impossible.");
        setLoading(false);
        return;
      }
      const byId = new Map(data?.map((r) => [r.widget_id, r]) ?? []);
      const merged: Record<string, Row> = {};
      for (const d of defs) {
        const existing = byId.get(d.id);
        merged[d.id] = {
          widget_id: d.id,
          enabled: existing?.enabled ?? d.enabled,
          display_order: existing?.display_order ?? d.order,
          event_types: existing?.event_types ?? d.eventTypes ?? null,
        };
      }
      setRows(merged);
      setLoading(false);
    })();
  }, [isAdmin, defs]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const resetOne = (d: WidgetDefinition) =>
    update(d.id, {
      enabled: d.enabled,
      display_order: d.order,
      event_types: d.eventTypes ?? null,
    });

  const save = async () => {
    setSaving(true);
    const payload = Object.values(rows).map((r) => ({
      widget_id: r.widget_id,
      enabled: r.enabled,
      display_order: r.display_order,
      event_types: r.event_types,
    }));
    const { error } = await supabase
      .from("widget_configs")
      .upsert(payload, { onConflict: "widget_id" });
    setSaving(false);
    if (error) {
      toast.error("Sauvegarde impossible.");
      return;
    }
    applyWidgetConfigs(payload);
    toast.success("Configuration enregistrée.");
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center gap-3 text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          Accès réservé aux administrateurs.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl">Studio des widgets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Active, ordonne et cible les widgets par type d'événement.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {SURFACES.map(({ key, label }) => {
        const list = defs
          .filter((d) => d.surface === key)
          .sort((a, b) => (rows[a.id]?.display_order ?? 0) - (rows[b.id]?.display_order ?? 0));
        if (list.length === 0) return null;
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {list.map((d) => {
                const r = rows[d.id];
                if (!r) return null;
                const showTypes = d.surface === "event.detail" || d.surface === "event.new";
                return (
                  <div key={d.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{d.name}</span>
                          {d.required && <Badge variant="secondary">Requis</Badge>}
                          {d.category && <Badge variant="outline">{d.category}</Badge>}
                          <code className="text-xs text-muted-foreground">{d.id}</code>
                        </div>
                        {d.description && (
                          <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={r.enabled || !!d.required}
                          disabled={!!d.required}
                          onCheckedChange={(v) => update(d.id, { enabled: v })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => resetOne(d)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-xs text-muted-foreground">Ordre</label>
                      <Input
                        type="number"
                        className="w-24 h-8"
                        value={r.display_order}
                        onChange={(e) =>
                          update(d.id, { display_order: Number(e.target.value) || 0 })
                        }
                      />
                    </div>

                    {showTypes && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Types d'événement (vide = tous)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {EVENT_TYPES.map((t) => {
                            const active = r.event_types?.includes(t.value) ?? false;
                            return (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                  const cur = r.event_types ?? [];
                                  const next = active
                                    ? cur.filter((x) => x !== t.value)
                                    : [...cur, t.value];
                                  update(d.id, {
                                    event_types: next.length === 0 ? null : next,
                                  });
                                }}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-accent"
                                }`}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
