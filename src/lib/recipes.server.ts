import {
  RECIPES_SETTINGS_KEY,
  normalizeRecipesConfig,
  type RecipesConfig,
} from "@/extensions/recipes/config";

export const RECIPES_BUCKET = "widget-photos";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadRecipesConfig(): Promise<RecipesConfig> {
  const db = await admin();
  const { data } = await db
    .from("invitation_settings")
    .select("settings")
    .eq("key", RECIPES_SETTINGS_KEY)
    .maybeSingle();
  return normalizeRecipesConfig((data as { settings?: unknown } | null)?.settings);
}

export async function saveRecipesConfigRow(config: RecipesConfig): Promise<void> {
  const db = await admin();
  await db
    .from("invitation_settings")
    .upsert({ key: RECIPES_SETTINGS_KEY, settings: config as never }, { onConflict: "key" });
}

/** Le plugin est-il actif globalement et pour cet événement ? */
export async function isRecipesEnabled(eventId: string): Promise<boolean> {
  const db = await admin();
  const config = await loadRecipesConfig();
  if (!config.enabled) return false;

  const { data: ext } = await db.from("extensions").select("enabled").eq("key", "recipes").maybeSingle();
  if ((ext as { enabled?: boolean } | null)?.enabled === false) return false;

  const { data: override } = await db
    .from("event_extensions")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("extension_key", "recipes")
    .maybeSingle();
  return (override as { enabled?: boolean } | null)?.enabled !== false;
}

export async function isOrganizer(eventId: string, userId: string): Promise<boolean> {
  const db = await admin();
  const { data } = await db.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
  return (data as { organizer_id?: string } | null)?.organizer_id === userId;
}

export type RecipeRow = {
  id: string;
  event_id: string;
  menu_item_id: string;
  title: string;
  text_content: string | null;
  external_url: string | null;
  external_url_note: string | null;
  created_by_user_id: string | null;
};

export async function loadRecipe(recipeId: string): Promise<RecipeRow | null> {
  const db = await admin();
  const { data } = await db
    .from("menu_recipe")
    .select("id, event_id, menu_item_id, title, text_content, external_url, external_url_note, created_by_user_id")
    .eq("id", recipeId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as RecipeRow | null) ?? null;
}

/** Identifiants d'invitation rattachés à cet utilisateur sur l'événement. */
export async function invitationIdsForUser(eventId: string, userId: string): Promise<string[]> {
  const db = await admin();
  const { data } = await db
    .from("invitations")
    .select("id")
    .eq("event_id", eventId)
    .eq("guest_user_id", userId)
    .is("revoked_at", null);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

export type RecipeAccess = { canView: boolean; canEdit: boolean };

export async function recipeAccess(row: RecipeRow, userId: string): Promise<RecipeAccess> {
  if (await isOrganizer(row.event_id, userId)) return { canView: true, canEdit: true };
  if (row.created_by_user_id === userId) return { canView: true, canEdit: true };

  const invitationIds = await invitationIdsForUser(row.event_id, userId);
  if (invitationIds.length === 0) return { canView: false, canEdit: false };

  const db = await admin();
  const { data } = await db
    .from("menu_recipe_share")
    .select("id")
    .eq("recipe_id", row.id)
    .in("invitation_id", invitationIds)
    .is("revoked_at", null)
    .limit(1);
  return { canView: ((data ?? []) as unknown[]).length > 0, canEdit: false };
}

export async function signRecipePath(path: string | null, minutes: number): Promise<string | null> {
  if (!path) return null;
  const db = await admin();
  const { data } = await db.storage.from(RECIPES_BUCKET).createSignedUrl(path, minutes * 60);
  return data?.signedUrl ?? null;
}
