import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Export RGPD : toutes les données personnelles détenues par la plateforme. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [profile, core, prefs, allergies, consents, events, invitations] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("user_id", userId),
      supabase.from("user_food_preferences").select("*").eq("user_id", userId),
      supabase.from("user_allergies").select("*").eq("user_id", userId),
      supabase.from("user_consents").select("*").eq("user_id", userId),
      supabase.from("events").select("*").eq("organizer_id", userId),
      supabase.from("invitations").select("*").eq("guest_user_id", userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: (claims as { email?: string })?.email ?? null },
      profile: profile.data ?? [],
      core_profile: core.data ?? [],
      food_preferences: prefs.data ?? [],
      allergies: allergies.data ?? [],
      consents: consents.data ?? [],
      events: events.data ?? [],
      invitations: invitations.data ?? [],
    };
  });

/**
 * Suppression du compte : les données personnelles sont effacées, les
 * contributions partagées sont anonymisées afin de ne pas détruire les
 * événements appartenant également à d'autres utilisateurs.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("profile_picture_path")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.profile_picture_path) {
      await supabaseAdmin.storage
        .from("avatars")
        .remove([
          profile.profile_picture_path,
          profile.profile_picture_path.replace("-256.webp", "-512.webp"),
        ]);
    }

    // Anonymisation des traces partagées.
    await supabaseAdmin
      .from("event_photos")
      .update({ uploaded_by_user_id: null, author_label: "Compte supprimé" })
      .eq("uploaded_by_user_id", userId);
    await supabaseAdmin
      .from("invitations")
      .update({ guest_user_id: null, name: "Compte supprimé", email: null, phone: null, phone_e164: null })
      .eq("guest_user_id", userId);

    // Données strictement personnelles.
    await supabaseAdmin.from("user_food_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_allergies").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("widget_items").delete().eq("owner_id", userId);
    await supabaseAdmin.from("extension_settings").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    await supabaseAdmin.from("audit_log").insert({
      user_id: null,
      action: "account.deleted",
      target: userId,
      metadata: { at: new Date().toISOString() },
    });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
