import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { resolveWidgetComponent } from "@/core/registry/components";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/w/$")({
  head: () => ({ meta: [{ title: "Widget — Framework" }] }),
  component: WidgetHost,
});

function WidgetHost() {
  const { _splat } = Route.useParams();
  const path = (_splat ?? "").replace(/^\/+|\/+$/g, "");
  const { data: widgets, isLoading } = useActiveWidgets();
  const { isAdmin, loading: sessionLoading } = useSession();

  if (isLoading || sessionLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du widget…
      </div>
    );
  }

  const widget = widgets.find((w) => (w.manifest.path ?? "").replace(/^\/+|\/+$/g, "") === path);

  if (!widget) return <NotFound path={path} />;

  const perms = widget.manifest.permissions ?? [];
  if (perms.includes("admin") && !isAdmin) {
    return (
      <div className="p-8">
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="p-6">
            <p className="text-sm text-destructive">Accès refusé. Ce widget est réservé aux administrateurs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Component = resolveWidgetComponent(widget.manifest.component);
  if (!Component) {
    return (
      <div className="p-8">
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-destructive">
              Composant <span className="font-mono">{widget.manifest.component}</span> introuvable dans le registre code.
            </p>
            <p className="text-xs text-muted-foreground">
              Vérifiez <span className="font-mono">src/core/registry/components.tsx</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Chargement…</div>}>
      <Component config={widget.manifest.config} />
    </Suspense>
  );
}

function NotFound({ path }: { path: string }) {
  return (
    <div className="p-8 max-w-xl">
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-6 space-y-3">
          <h2 className="font-medium">Widget introuvable</h2>
          <p className="text-sm text-muted-foreground">
            Aucun widget actif ne correspond au chemin <span className="font-mono">/{path}</span>.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/app">Retour au tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
