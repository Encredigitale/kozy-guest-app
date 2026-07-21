import type { ComponentType, LazyExoticComponent } from "react";
import type { WidgetProps } from "@/core/registry/components";
import type { SettingField } from "./manifest.schema";

export type ExtensionMenuLink = {
  label: string;
  path: string;
  icon?: string;
  section?: string;
  order?: number;
};

export type ExtensionScreen = {
  path: string;
  label: string;
  component: LazyExoticComponent<ComponentType>;
};

export type ExtensionWidget = {
  key: string;
  component: LazyExoticComponent<ComponentType<WidgetProps>>;
};

export type ExtensionScope = "global" | "event" | "both";

export type ExtensionDefinition = {
  key: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  version?: string;
  scope?: ExtensionScope;
  /** Auto-generated form fields for the settings screen. */
  settingsSchema?: SettingField[];
  /** Optional custom settings screen (overrides the auto form). */
  settingsComponent?: LazyExoticComponent<ComponentType<{ eventId?: string }>>;
  widgets?: ExtensionWidget[];
  screens?: ExtensionScreen[];
  menu?: ExtensionMenuLink[];
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
  sort_order: number;
  min_core_version: string;
  min_db_version: number;
  scope: ExtensionScope;
  menu_order: Record<string, number>;
  installed_from: string | null;
  created_at: string;
  updated_at: string;
};

export type EventExtensionRow = {
  id: string;
  event_id: string;
  extension_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ExtensionSettingsRow = {
  id: string;
  extension_key: string;
  event_id: string | null;
  user_id: string;
  settings: Record<string, unknown>;
};
