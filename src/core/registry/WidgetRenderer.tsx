import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSurfaceWidgets } from "./useRegistry";
import { resolveWidgetComponent } from "./components";
import { useSession } from "@/core/auth/useSession";
import type { SurfaceContext } from "./types";

type Props = {
  surface: string;
  eventType?: string;
  /** Contextual roles for this surface (e.g. ["organizer"], ["guest"]). */
  contextualRoles?: string[];
  /** Extra config merged into every widget's manifest.config. */
  context?: Record<string, unknown>;
  /** Optional fallback when no widget matches the surface. */
  fallback?: React.ReactNode;
};

export function WidgetRenderer({ surface, eventType, contextualRoles, context, fallback }: Props) {
  const { isAdmin } = useSession();
  const ctx: SurfaceContext = { eventType, isAdmin, contextualRoles };
  const { data: widgets, isLoading } = useSurfaceWidgets(surface, ctx);


  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (widgets.length === 0) {
    return <>{fallback ?? null}</>;
  }

  return (
    <div className="space-y-6">
      {widgets.map((w) => {
        const Component = resolveWidgetComponent(w.manifest.component);
        if (!Component) {
          return (
            <div
              key={w.id}
              className="p-4 rounded-lg border border-destructive/40 text-xs text-destructive"
            >
              Composant <span className="font-mono">{w.manifest.component}</span> introuvable.
            </div>
          );
        }
        const merged = { ...(w.manifest.config ?? {}), ...(context ?? {}) };
        return (
          <Suspense
            key={w.id}
            fallback={<div className="p-4 text-sm text-muted-foreground">Chargement…</div>}
          >
            <Component config={merged} />
          </Suspense>
        );
      })}
    </div>
  );
}
