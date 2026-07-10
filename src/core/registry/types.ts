// Widget manifest shape stored in the `widgets` table.
// The Core reads this to build routes, menus and permission gates.

export type WidgetMenuEntry = {
  label: string;
  icon?: string; // lucide-react icon name
  section?: string; // menu grouping (e.g. "Général", "Admin")
  order?: number;
};

export type WidgetManifest = {
  // Key used to resolve the React component in the code-side registry.
  component: string;
  // URL segment mounted under /app/w/<path>. Required for routed widgets.
  path?: string;
  // Menu entry. Omit to hide from navigation.
  menu?: WidgetMenuEntry;
  // Role names required to see/access the widget. Empty = any authenticated user.
  permissions?: string[];
  // Free-form widget configuration passed as props.
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
