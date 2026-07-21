// Widget manifest shape stored in the `widgets` table.
// The Registry is the brain: screens never import widgets directly, they
// query the Registry which returns filtered, ordered widget lists.

export type WidgetMenuEntry = {
  label: string;
  icon?: string; // lucide-react icon name
  section?: string; // menu grouping
  order?: number;
};

export type WidgetSize = "sm" | "md" | "lg" | "full";
export type WidgetStatus = "draft" | "published";

export type WidgetManifest = {
  component: string;
  surface?: string;
  order?: number;
  path?: string;
  menu?: WidgetMenuEntry;
  required?: boolean;
  visible?: boolean;
  eventTypes?: string[];
  permissions?: string[];
  dependencies?: string[];
  icon?: string;
  config?: Record<string, unknown>;
};

export type WidgetRow = {
  id: string;
  name: string;
  description: string | null;
  version: string;
  category: string | null;
  manifest: WidgetManifest;
  enabled: boolean;
  status?: WidgetStatus;
  size?: WidgetSize;
  created_at: string;
  updated_at: string;
};

export type SurfaceContext = {
  eventType?: string;
  isAdmin?: boolean;
  /** App-level custom roles. */
  roles?: string[];
  /** Contextual roles for this surface, e.g. ["organizer"] or ["guest"]. */
  contextualRoles?: string[];
  /** When provided, event_widgets overrides apply for surface `event.detail`. */
  eventId?: string;
  /** Ignore `status = 'published'` gating (admin preview). */
  includeDrafts?: boolean;
};

export type EventWidgetRow = {
  event_id: string;
  widget_id: string;
  enabled: boolean;
  position: number;
  size: WidgetSize | null;
};

export type WidgetRoleBinding = {
  widget_id: string;
  role: string;
};

export type DashboardLayoutRow = {
  id: string;
  user_id: string | null;
  widget_id: string;
  position: number;
  size: WidgetSize;
  visible: boolean;
};

export type ResolvedPlacement = {
  widget: WidgetRow;
  size: WidgetSize;
  order: number;
  config: Record<string, unknown>;
};
