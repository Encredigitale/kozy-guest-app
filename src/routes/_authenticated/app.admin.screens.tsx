import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWidgets, widgetsQueryOptions } from "@/core/registry/useRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ExternalLink, Wand2 } from "lucide-react";
import type { WidgetRow } from "@/core/registry/types";

export const Route = createFileRoute("/_authenticated/app/admin/screens")({
  head: () => ({
    meta: [
      { title: "Gestion des écrans — Admin Kozy" },
      { name: "description", content: "Surfaces d'affichage de l'application et widgets associés." },
    ],
  }),
  component: AdminScreens,
});

type Screen = { surface: string; label: string; route?: string; description: string };

const SCREENS: Screen[] = [
  { surface: "dashboard", label: "Accueil", route: "/app", description: "Tableau de bord de l'utilisateur." },
  { surface: "event.new", label: "Création d'événement", route: "/app/events/new", description: "Étapes du wizard de création." },
  { surface: "event.detail", label: "Page d'un événement", description: "Modules affichés sur un événement." },
  { surface: "profile", label: "Profil", route: "/app/profile", description: "Écran du profil utilisateur." },
  { surface: "menu", label: "Menu / Thème", description: "Composantes de repas et thème." },
];

function AdminScreens() {
  const { data: widgets = [], isLoading } = useWidgets();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: widgetsQueryOptions.queryKey });

  const bySurface = useMemo(() => {
    const map = new Map<string, WidgetRow[]>();
    for (const w of widgets) {
      const s = w.manifest?.surface ?? "—";
      map.set(s, [...(map.get(s) ?? []), w]);
    }
    for (const [, list] of map) list.sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
    return map;
  }, [widgets]);

  const extraSurfaces = useMemo(
    () => [...bySurface.keys()].filter((s) => !SCREENS.some((x) => x.surface === s)),
    [bySurface],
  );

  const toggle = async (w: WidgetRow, enabled: boolean) => {
    const { error } = await supabase.from("widgets").update({ enabled }).eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(`${w.name} ${enabled ? "activé" : "désactivé"}`);
    refresh();
  };

  const screens: Screen[] = [
    ...SCREENS,
    ...extraSurfaces.map((s) => ({ surface: s, label: s, description: "Surface personnalisée." })),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl tracking-tight">Gestion des écrans</h1>
        <p className="text-sm text-muted-foreground">
          Chaque écran est une surface pilotée par le registre. Activez ici les widgets qui s'y affichent.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <div className="space-y-4">
        {screens.map((s) => {
          const list = bySurface.get(s.surface) ?? [];
          return (
            <Card key={s.surface}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.surface}</Badge>
                    <Badge variant="outline">{list.length} widget(s)</Badge>
                    {s.route && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={s.route}>
                          <ExternalLink className="h-4 w-4" /> Voir
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/app/admin/studio">
                        <Wand2 className="h-4 w-4" /> Studio
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 && <p className="text-sm text-muted-foreground">Aucun widget sur cet écran.</p>}
                {list.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{w.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{w.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{w.manifest?.order ?? 0}</Badge>
                      {w.manifest?.required && <Badge variant="secondary">requis</Badge>}
                      <Switch
                        checked={w.enabled}
                        disabled={w.manifest?.required}
                        onCheckedChange={(v) => toggle(w, v)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
