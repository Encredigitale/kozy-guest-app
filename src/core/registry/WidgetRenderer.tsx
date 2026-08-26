import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSurfaceWidgets } from "./useRegistry";
import { resolveWidgetComponent } from "./components";
import { useSession } from "@/core/auth/useSession";
import type { SurfaceContext, WidgetSize } from "./types";

type Props = {
  surface: string;
  eventType?: string;
  /** Contextual roles for this surface (e.g. ["organizer"], ["guest"]). */
  contextualRoles?: string[];
  /** Event ID to enable per-event overrides on surface "event.detail". */
  eventId?: string;
  /** Extra config merged into every widget's manifest.config. */
  context?: Record<string, unknown>;
  /** Optional fallback when no widget matches the surface. */
  fallback?: React.ReactNode;
  /** Grid vs stacked rendering. Grid is default. */
  layout?: "grid" | "stack";
  /** Include drafts (admin preview only). */
  includeDrafts?: boolean;
};

const SIZE_TO_COL: Record<WidgetSize, string> = {
  sm: "md:col-span-4 col-span-12",
  md: "md:col-span-6 col-span-12",
  lg: "md:col-span-8 col-span-12",
  full: "col-span-12",
};

export function WidgetRenderer({
  surface,
  eventType,
  contextualRoles,
  eventId,
  context,
  fallback,
  layout = "grid",
  includeDrafts,
}: Props) {
  const { isAdmin } = useSession();
  const ctx: SurfaceContext = { eventType, isAdmin, contextualRoles, eventId, includeDrafts };
  const { data: placements, isLoading } = useSurfaceWidgets(surface, ctx);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (placements.length === 0) {
    return <>{fallback ?? null}</>;
  }

  if (layout === "stack") {
    return (
      <div className="space-y-6">
        {placements.map((p) => (
          <RenderOne key={p.widget.id} placement={p} extra={context} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {placements.map((p) => (
        <div key={p.widget.id} className={SIZE_TO_COL[p.size]}>
          <RenderOne placement={p} extra={context} />
        </div>
      ))}
    </div>
  );
}

function RenderOne({
  placement,
  extra,
}: {
  placement: import("./types").ResolvedPlacement;
  extra?: Record<string, unknown>;
}) {
  const { widget: w, config } = placement;
  const Component = resolveWidgetComponent(w.manifest.component);
  if (!Component) {
    return null;
  }
  const merged = { ...config, ...(extra ?? {}) };
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Chargement…</div>}>
      <Component config={merged} />
    </Suspense>
  );
}
