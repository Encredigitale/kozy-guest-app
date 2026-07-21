// Widget manifest shape stored in the `widgets` table.
// The Registry is the brain: screens never import widgets directly, they
// query the Registry which returns filtered, ordered widget lists.

export type WidgetMenuEntry = {
  label: string;
  icon?: string; // lucide-react icon name
  section?: string; // menu grouping
  order?: number;
};

export type WidgetManifest = {
  // Key used to resolve the React component in the code-side registry.
  component: string;

  // ---- Placement ----
  // Surface identifier where the widget is mounted (e.g. "event.detail",
  // "dashboard", "contact.detail"). A surface is a screen slot rendered
  // by <WidgetRenderer surface="..." />.
  surface?: string;
  // Order inside the surface (ascending). Defaults to 0.
  order?: number;

  // ---- Routing (optional, for routed widgets under /app/w/<path>) ----
  path?: string;
  menu?: WidgetMenuEntry;

  // ---- Visibility & lifecycle ----
  // If true, cannot be disabled from the admin UI.
  required?: boolean;
  // If false, still active but hidden from screens (kept for future).
  visible?: boolean;

  // ---- Targeting ----
  // Only render for these event types (empty/absent = any type).
  eventTypes?: string[];
  // Role names required to see the widget. Empty = any authenticated user.
  permissions?: string[];
  // IDs of widgets this one depends on (must be enabled).
  dependencies?: string[];

  // ---- Metadata ----
  icon?: string;

  // ---- Widget configuration ----
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
  created_at: string;
  updated_at: string;
};

export type SurfaceContext = {
  eventType?: string;
  isAdmin?: boolean;
  roles?: string[];
};
