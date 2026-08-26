import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWidgets } from "@/core/registry/useRegistry";
import { useExtensions } from "@/core/extensions";
import { CORE_VERSION, DB_VERSION } from "@/core/version";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutGrid, MonitorSmartphone, Puzzle, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord admin — Kosy" },
      { name: "description", content: "Vue d'ensemble du core, des écrans, des widgets et des plugins." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const { data: widgets = [] } = useWidgets();
  const { data: extensions = [] } = useExtensions();

  const stats = useMemo(() => {
    const surfaces = new Set(widgets.map((w) => w.manifest?.surface).filter(Boolean) as string[]);
    return {
      widgets: widgets.length,
      widgetsActive: widgets.filter((w) => w.enabled).length,
      surfaces: surfaces.size,
      extensions: extensions.length,
      extensionsActive: extensions.filter((e) => e.enabled).length,
    };
  }, [widgets, extensions]);

  const tiles = [
    {
      to: "/app/admin/screens",
      title: "Écrans",
      Icon: MonitorSmartphone,
      value: `${stats.surfaces} surfaces`,
      desc: "Surfaces de rendu et widgets qui y sont placés.",
    },
    {
      to: "/app/admin/studio",
      title: "Widgets",
      Icon: Wand2,
      value: `${stats.widgetsActive}/${stats.widgets} actifs`,
      desc: "Créer, configurer, publier et ordonner les widgets.",
    },
    {
      to: "/app/admin/extensions",
      title: "Plugins",
      Icon: Puzzle,
      value: `${stats.extensionsActive}/${stats.extensions} actifs`,
      desc: "Extensions installées et leurs réglages.",
    },
    {
      to: "/app/admin/registry",
      title: "Registry",
      Icon: LayoutGrid,
      value: "Référentiel",
      desc: "Vue brute du registre des composants.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Pilotage du framework : core, écrans, widgets et plugins.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(({ to, title, Icon, value, desc }) => (
          <Card key={to}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" /> {title}
              </CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="secondary">{value}</Badge>
              <Button asChild size="sm" variant="ghost">
                <Link to={to}>Ouvrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Core</CardTitle>
          <CardDescription>Versions déployées et référentiels de configuration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Core v{CORE_VERSION}</Badge>
          <Badge variant="outline">DB v{DB_VERSION}</Badge>
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/admin/event-types">Types d'événement</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/admin/menu-components">Composantes de repas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
