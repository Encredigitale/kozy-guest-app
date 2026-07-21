import type { ComponentType, LazyExoticComponent } from "react";
import type { WidgetProps } from "@/core/registry/components";

export type ExtensionMenuLink = {
  label: string;
  path: string;
  icon?: string;
  section?: string;
};

export type ExtensionScreen = {
  path: string;
  label: string;
  component: LazyExoticComponent<ComponentType>;
};

export type ExtensionWidget = {
  /** Component key resolvable through the widget registry (e.g. "ext.weather"). */
  key: string;
  component: LazyExoticComponent<ComponentType<WidgetProps>>;
};

export type ExtensionDefinition = {
  /** Unique extension key. Must match the `extensions.key` column. */
  key: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  version?: string;
  widgets?: ExtensionWidget[];
  screens?: ExtensionScreen[];
  menu?: ExtensionMenuLink[];
  /** Optional side effects run once when the extension is activated. */
  onActivate?: () => void;
};

export type ExtensionRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  version: string;
  enabled: boolean;
  manifest: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
