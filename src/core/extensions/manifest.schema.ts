import { z } from "zod";

/**
 * Manifest imported via the admin install flow. The manifest describes
 * metadata + capabilities of an extension. The **code** for widgets and
 * screens must still be bundled in `src/extensions/<key>/` and declared
 * in `src/core/extensions/registry.ts` — a manifest alone cannot execute
 * arbitrary JS at runtime.
 */
export const settingFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "boolean", "select", "textarea"]),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
  description: z.string().optional(),
});

export const menuLinkSchema = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
  icon: z.string().optional(),
  order: z.number().optional(),
});

export const extensionManifestSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, "clé en kebab-case"),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  version: z.string().min(1),
  min_core_version: z.string().optional(),
  min_db_version: z.number().int().nonnegative().optional(),
  scope: z.enum(["global", "event", "both"]).optional(),
  widgets: z.array(z.object({ key: z.string(), surface: z.string().optional() })).optional(),
  screens: z.array(z.object({ path: z.string(), label: z.string() })).optional(),
  menu: z.array(menuLinkSchema).optional(),
  settingsSchema: z.array(settingFieldSchema).optional(),
});

export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;
export type SettingField = z.infer<typeof settingFieldSchema>;
