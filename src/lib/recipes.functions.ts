import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  RecipeCandidate,
  RecipeDetail,
  RecipeSummary,
} from "@/extensions/recipes/public-types";
import { normalizeRecipeUrl } from "@/extensions/recipes/config";

const photoInput = z.object({
  path: z.string().min(3).max(300),
  width: z.number().int().min(0).default(0),
  height: z.number().int().min(0).default(0),
});

/** Recettes de l'événement visibles par l'appelant, indexées par élément de menu. */
export const listMenuRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ enabled: boolean; recipes: RecipeSummary[] }> => {
    const { admin, isRecipesEnabled, isOrganizer, invitationIdsForUser } = await import(
      "@/lib/recipes.server"
    );
    const enabled = await isRecipesEnabled(data.eventId);
    if (!enabled) return { enabled: false, recipes: [] };

    const db = await admin();
    const organizer = await isOrganizer(data.eventId, context.userId);

    const { data: rows } = await db
      .from("menu_recipe")
      .select("id, menu_item_id, title, text_content, external_url, created_by_user_id")
      .eq("event_id", data.eventId)
      .is("deleted_at", null);
    let list = (rows ?? []) as unknown as Array<Record<string, any>>;
    if (list.length === 0) return { enabled: true, recipes: [] };

    const { data: photos } = await db
      .from("menu_recipe_photo")
      .select("recipe_id")
      .in("recipe_id", list.map((r) => r.id as string));
    const photoCounts = ((photos ?? []) as { recipe_id: string }[]).reduce<Record<string, number>>(
      (acc, p) => {
        acc[p.recipe_id] = (acc[p.recipe_id] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const { data: shares } = await db
      .from("menu_recipe_share")
      .select("recipe_id, invitation_id")
      .in("recipe_id", list.map((r) => r.id as string))
      .is("revoked_at", null);
    const shareRows = (shares ?? []) as { recipe_id: string; invitation_id: string }[];
    const shareCounts = shareRows.reduce<Record<string, number>>((acc, s) => {
      acc[s.recipe_id] = (acc[s.recipe_id] ?? 0) + 1;
      return acc;
    }, {});

    if (!organizer) {
      const mine = new Set(await invitationIdsForUser(data.eventId, context.userId));
      const allowed = new Set(
        shareRows.filter((s) => mine.has(s.invitation_id)).map((s) => s.recipe_id),
      );
      list = list.filter(
        (r) => allowed.has(r.id as string) || r.created_by_user_id === context.userId,
      );
    }

    return {
      enabled: true,
      recipes: list.map((r) => ({
        id: r.id as string,
        menuItemId: r.menu_item_id as string,
        title: (r.title as string) ?? "",
        hasText: Boolean((r.text_content as string | null)?.trim()),
        photoCount: photoCounts[r.id as string] ?? 0,
        hasLink: Boolean(r.external_url),
        shareCount: shareCounts[r.id as string] ?? 0,
        canEdit: organizer || r.created_by_user_id === context.userId,
      })),
    };
  });

/** Fiche complète, avec URL signées temporaires pour les photos. */
export const getRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ recipeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; recipe?: RecipeDetail; error?: string }> => {
    const { admin, loadRecipe, recipeAccess, loadRecipesConfig, signRecipePath } = await import(
      "@/lib/recipes.server"
    );
    const row = await loadRecipe(data.recipeId);
    if (!row) return { ok: false, error: "not_found" };

    const access = await recipeAccess(row, context.userId);
    if (!access.canView) return { ok: false, error: "forbidden" };

    const db = await admin();
    const config = await loadRecipesConfig();

    const { data: photos } = await db
      .from("menu_recipe_photo")
      .select("id, storage_path, sort_order")
      .eq("recipe_id", row.id)
      .order("sort_order", { ascending: true });

    const photoList = await Promise.all(
      ((photos ?? []) as { id: string; storage_path: string; sort_order: number }[]).map(async (p) => ({
        id: p.id,
        path: p.storage_path,
        url: await signRecipePath(p.storage_path, config.signedUrlMinutes),
        sortOrder: p.sort_order,
      })),
    );

    let shares: RecipeDetail["shares"] = [];
    if (access.canEdit) {
      const { data: shareRows } = await db
        .from("menu_recipe_share")
        .select("invitation_id")
        .eq("recipe_id", row.id)
        .is("revoked_at", null);
      const ids = ((shareRows ?? []) as { invitation_id: string }[]).map((s) => s.invitation_id);
      if (ids.length > 0) {
        const { data: invs } = await db
          .from("invitations")
          .select("id, name, email, status")
          .in("id", ids);
        shares = ((invs ?? []) as { id: string; name: string | null; email: string | null; status: string }[]).map(
          (i) => ({ invitationId: i.id, name: i.name || i.email || "Invité", status: i.status }),
        );
      }
    }

    return {
      ok: true,
      recipe: {
        id: row.id,
        eventId: row.event_id,
        menuItemId: row.menu_item_id,
        title: row.title,
        textContent: row.text_content,
        externalUrl: row.external_url,
        externalUrlNote: row.external_url_note,
        photos: photoList,
        shares,
        canEdit: access.canEdit,
      },
    };
  });

/** Emplacement d'envoi signé pour une photo de recette. */
export const createRecipePhotoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        mimeType: z.string().min(3).max(80),
        originalSize: z.number().int().min(1),
      })
      .parse(data),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; error?: string; path?: string; uploadUrl?: string }> => {
      const { admin, isOrganizer, isRecipesEnabled, loadRecipesConfig, RECIPES_BUCKET } = await import(
        "@/lib/recipes.server"
      );
      if (!(await isRecipesEnabled(data.eventId))) return { ok: false, error: "disabled" };
      if (!(await isOrganizer(data.eventId, context.userId))) return { ok: false, error: "forbidden" };

      const config = await loadRecipesConfig();
      if (!config.allowPhotos) return { ok: false, error: "disabled" };
      if (data.originalSize > config.maxFileSizeMb * 1024 * 1024) return { ok: false, error: "too_large" };

      const db = await admin();
      const path = `recipes/${data.eventId}/${crypto.randomUUID()}.webp`;
      const { data: signed, error } = await db.storage.from(RECIPES_BUCKET).createSignedUploadUrl(path);
      if (error || !signed) return { ok: false, error: "storage_unavailable" };
      return { ok: true, path, uploadUrl: signed.signedUrl };
    },
  );

/** Création ou mise à jour d'une recette (au moins un contenu requis). */
export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        menuItemId: z.string().uuid(),
        recipeId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(160),
        textContent: z.string().max(20000).nullable().optional(),
        externalUrl: z.string().max(600).nullable().optional(),
        externalUrlNote: z.string().max(600).nullable().optional(),
        photos: z.array(photoInput).max(2).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; recipeId?: string }> => {
    const { admin, isOrganizer, isRecipesEnabled, loadRecipesConfig, RECIPES_BUCKET } = await import(
      "@/lib/recipes.server"
    );
    if (!(await isRecipesEnabled(data.eventId))) return { ok: false, error: "disabled" };
    if (!(await isOrganizer(data.eventId, context.userId))) return { ok: false, error: "forbidden" };

    const config = await loadRecipesConfig();
    const db = await admin();

    const text = config.allowText ? (data.textContent ?? "").trim() : "";
    const rawUrl = config.allowLink ? (data.externalUrl ?? "").trim() : "";
    const url = rawUrl ? normalizeRecipeUrl(rawUrl) : null;
    if (rawUrl && !url) return { ok: false, error: "invalid_url" };
    const photos = (config.allowPhotos ? data.photos : []).slice(0, config.maxPhotos);
    for (const p of photos) {
      if (!p.path.startsWith(`recipes/${data.eventId}/`)) return { ok: false, error: "invalid_path" };
    }
    if (!text && !url && photos.length === 0) return { ok: false, error: "empty" };

    const payload = {
      event_id: data.eventId,
      menu_item_id: data.menuItemId,
      title: data.title.trim(),
      text_content: text || null,
      external_url: url,
      external_url_note: url ? (data.externalUrlNote ?? "").trim() || null : null,
    };

    let recipeId = data.recipeId ?? null;
    if (recipeId) {
      const { error } = await db
        .from("menu_recipe")
        .update(payload as never)
        .eq("id", recipeId)
        .eq("event_id", data.eventId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: inserted, error } = await db
        .from("menu_recipe")
        .insert({ ...payload, created_by_user_id: context.userId } as never)
        .select("id")
        .single();
      if (error || !inserted) return { ok: false, error: error?.message ?? "insert_failed" };
      recipeId = (inserted as { id: string }).id;
    }

    // Photos : on réécrit la liste, l'ordre correspond à l'ordre reçu.
    const { data: existing } = await db
      .from("menu_recipe_photo")
      .select("id, storage_path")
      .eq("recipe_id", recipeId);
    const keep = new Set(photos.map((p) => p.path));
    const stale = ((existing ?? []) as { id: string; storage_path: string }[]).filter(
      (p) => !keep.has(p.storage_path),
    );
    if (stale.length > 0) {
      await db.from("menu_recipe_photo").delete().in("id", stale.map((p) => p.id));
      await db.storage.from(RECIPES_BUCKET).remove(stale.map((p) => p.storage_path));
    }
    const byPath = new Map(
      ((existing ?? []) as { id: string; storage_path: string }[]).map((p) => [p.storage_path, p.id]),
    );
    for (const [index, p] of photos.entries()) {
      const id = byPath.get(p.path);
      if (id) {
        await db.from("menu_recipe_photo").update({ sort_order: index } as never).eq("id", id);
      } else {
        await db.from("menu_recipe_photo").insert({
          recipe_id: recipeId,
          storage_path: p.path,
          width: p.width,
          height: p.height,
          sort_order: index,
        } as never);
      }
    }

    return { ok: true, recipeId };
  });

/** Suppression de la recette : l'élément de menu reste inchangé. */
export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ recipeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { admin, loadRecipe, recipeAccess, RECIPES_BUCKET } = await import("@/lib/recipes.server");
    const row = await loadRecipe(data.recipeId);
    if (!row) return { ok: false, error: "not_found" };
    const access = await recipeAccess(row, context.userId);
    if (!access.canEdit) return { ok: false, error: "forbidden" };

    const db = await admin();
    const { data: photos } = await db
      .from("menu_recipe_photo")
      .select("storage_path")
      .eq("recipe_id", row.id);
    const paths = ((photos ?? []) as { storage_path: string }[]).map((p) => p.storage_path);
    if (paths.length > 0) await db.storage.from(RECIPES_BUCKET).remove(paths);

    await db.from("menu_recipe").delete().eq("id", row.id);
    return { ok: true };
  });

/** Invités de l'événement pouvant recevoir la recette (les refus sont exclus). */
export const listRecipeShareCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; candidates: RecipeCandidate[] }> => {
    const { admin, isOrganizer } = await import("@/lib/recipes.server");
    if (!(await isOrganizer(data.eventId, context.userId))) return { ok: false, candidates: [] };

    const db = await admin();
    const { data: rows } = await db
      .from("invitations")
      .select("id, name, email, status")
      .eq("event_id", data.eventId)
      .is("revoked_at", null)
      .order("created_at", { ascending: true });

    const candidates = ((rows ?? []) as {
      id: string;
      name: string | null;
      email: string | null;
      status: string;
    }[])
      .filter((r) => r.status !== "declined" && r.status !== "cancelled")
      .map((r) => ({
        invitationId: r.id,
        name: r.name || r.email || "Invité",
        status: r.status,
        accepted: r.status === "accepted",
      }));
    return { ok: true, candidates };
  });

/** Partage ciblé : la liste reçue devient la liste des accès actifs. */
export const setRecipeShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        recipeId: z.string().uuid(),
        invitationIds: z.array(z.string().uuid()).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; added: number }> => {
    const { admin, loadRecipe, recipeAccess, loadRecipesConfig } = await import("@/lib/recipes.server");
    const row = await loadRecipe(data.recipeId);
    if (!row) return { ok: false, error: "not_found", added: 0 };
    const access = await recipeAccess(row, context.userId);
    if (!access.canEdit) return { ok: false, error: "forbidden", added: 0 };

    const config = await loadRecipesConfig();
    if (!config.allowSharing) return { ok: false, error: "disabled", added: 0 };

    const db = await admin();
    const { data: invs } = await db
      .from("invitations")
      .select("id, name, guest_user_id, status")
      .eq("event_id", row.event_id)
      .is("revoked_at", null);
    const valid = new Map(
      ((invs ?? []) as { id: string; name: string | null; guest_user_id: string | null; status: string }[])
        .filter((i) => i.status !== "declined" && i.status !== "cancelled")
        .map((i) => [i.id, i]),
    );
    const target = data.invitationIds.filter((id) => valid.has(id));

    const { data: current } = await db
      .from("menu_recipe_share")
      .select("id, invitation_id")
      .eq("recipe_id", row.id)
      .is("revoked_at", null);
    const currentRows = (current ?? []) as { id: string; invitation_id: string }[];
    const currentIds = new Set(currentRows.map((s) => s.invitation_id));

    const toRevoke = currentRows.filter((s) => !target.includes(s.invitation_id));
    if (toRevoke.length > 0) {
      await db
        .from("menu_recipe_share")
        .update({ revoked_at: new Date().toISOString() } as never)
        .in("id", toRevoke.map((s) => s.id));
    }

    const toAdd = target.filter((id) => !currentIds.has(id));
    if (toAdd.length > 0) {
      await db.from("menu_recipe_share").insert(
        toAdd.map((id) => ({
          recipe_id: row.id,
          invitation_id: id,
          shared_by_user_id: context.userId,
        })) as never,
      );

      const { data: profile } = await db
        .from("profiles")
        .select("display_name")
        .eq("user_id", context.userId)
        .maybeSingle();
      const author = (profile as { display_name?: string } | null)?.display_name ?? "L'organisateur";

      const notifications = toAdd
        .map((id) => valid.get(id))
        .filter((i): i is { id: string; name: string | null; guest_user_id: string | null; status: string } =>
          Boolean(i?.guest_user_id),
        )
        .map((i) => ({
          user_id: i.guest_user_id as string,
          channel: "inapp" as const,
          type: "recipe_shared",
          title: "Recette partagée",
          body: `${author} vous a partagé la recette « ${row.title} ».`,
          metadata: { eventId: row.event_id, recipeId: row.id },
          status: "sent" as const,
          sent_at: new Date().toISOString(),
        }));
      if (notifications.length > 0) await db.from("notifications").insert(notifications as never);
    }

    return { ok: true, added: toAdd.length };
  });
