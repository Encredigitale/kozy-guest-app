import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSurfaceWidgets } from "./useRegistry";
import { resolveWidgetComponent } from "./components";
import { useSession } from "@/core/auth/useSession";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  /** Grid, stacked, accordion or 2-column grid rendering. Grid is default. */
  layout?: "grid" | "stack" | "accordion" | "grid-2";
  /** Include drafts (admin preview only). */
  includeDrafts?: boolean;
};

const SIZE_TO_COL: Record<WidgetSize, string> = {
  sm: "md:col-span-4 col-span-12",
  md: "md:col-span-6 col-span-12",
  lg: "md:col-span-8 col-span-12",
  full: "col-span-12",
};

/** Ordre imposé des blocs sur la page événement. */
const EVENT_DETAIL_ORDER: string[] = [
  "event.info",
  "event.guests",
  "event.menu",
  "ext.contributions",
  "ext.guest-brings",
];

function orderIndex(component: string): number {
  const i = EVENT_DETAIL_ORDER.indexOf(component);
  return i === -1 ? EVENT_DETAIL_ORDER.length + 1 : i;
}

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

  if (layout === "accordion") {
    const ordered = [...placements].sort(
      (a, b) =>
        orderIndex(a.widget.manifest.component) - orderIndex(b.widget.manifest.component) ||
        a.order - b.order,
    );
    const first = ordered[0];
    return (
      <Accordion
        type="multiple"
        defaultValue={first ? [first.widget.id] : []}
        className="space-y-3"
      >
        {ordered.map((p) => (
          <AccordionItem
            key={p.widget.id}
            value={p.widget.id}
            className="rounded-2xl border border-border/60 bg-card px-4 last:border-b"
          >
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              {p.widget.name}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <RenderOne placement={p} extra={context} bare />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
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

  if (layout === "grid-2") {
    const ordered = [...placements].sort(
      (a, b) =>
        orderIndex(a.widget.manifest.component) - orderIndex(b.widget.manifest.component) ||
        a.order - b.order,
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ordered.map((p) => (
          <div key={p.widget.id} className="col-span-1">
            <RenderOne placement={p} extra={context} />
          </div>
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
  bare,
}: {
  placement: import("./types").ResolvedPlacement;
  extra?: Record<string, unknown>;
  /** Aplatit la carte du widget quand il est déjà encadré (accordéon). */
  bare?: boolean;
}) {
  const { widget: w, config } = placement;
  const Component = resolveWidgetComponent(w.manifest.component);
  if (!Component) {
    return null;
  }
  const merged = { ...config, ...(extra ?? {}) };
  const content = (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Chargement…</div>}>
      <Component config={merged} />
    </Suspense>
  );
  if (!bare) return content;
  return (
    <div className="[&>*]:border-0 [&>*]:bg-transparent [&>*]:shadow-none [&>*]:rounded-none [&>*]:p-0">
      {content}
    </div>
  );
}

