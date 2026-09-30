import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertSuperAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_superadmin", { _user_id: ctx.userId });
  if (error || data !== true) throw new Response("Forbidden", { status: 403 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertSuperAdmin(context as Ctx);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const nowIso = new Date().toISOString();
    const count = async (q: any) => (await q).count ?? 0;
    const [users, usersMonth, events, upcoming, invitations, accepted, extTotal, extActive] = await Promise.all([
      count(db.from("profiles").select("user_id", { count: "exact", head: true })),
      count(db.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString())),
      count(db.from("events").select("id", { count: "exact", head: true })),
      count(db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", nowIso)),
      count(db.from("invitations").select("id", { count: "exact", head: true })),
      count(db.from("invitations").select("id", { count: "exact", head: true }).eq("status", "accepted")),
      count(db.from("extensions").select("id", { count: "exact", head: true })),
      count(db.from("extensions").select("id", { count: "exact", head: true }).eq("enabled", true)),
    ]);
    const [{ data: newUsers }, { data: newEvents }, { data: audit }] = await Promise.all([
      db.from("profiles").select("display_name, created_at").order("created_at", { ascending: false }).limit(5),
      db.from("events").select("title, created_at").order("created_at", { ascending: false }).limit(5),
      db.from("admin_audit_log").select("action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(5),
    ]);
    const activity = [
      ...(newUsers ?? []).map((u: any) => ({ kind: "Nouvel utilisateur", label: u.display_name ?? "—", at: u.created_at })),
      ...(newEvents ?? []).map((e: any) => ({ kind: "Nouvel événement", label: e.title, at: e.created_at })),
      ...(audit ?? []).map((a: any) => ({ kind: a.action, label: a.entity_id ?? a.entity_type ?? "", at: a.created_at })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 8);
    return { users, usersMonth, events, upcoming, invitations, accepted, extTotal, extActive, activity };
  });

const listInput = z.object({ kind: z.enum(["users", "events", "invitations", "contacts", "audit", "extensions"]) });

export const listAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertSuperAdmin(context as Ctx);
    let rows: any[] = [];
    if (data.kind === "users") {
      const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
      const { data: roles } = await db.from("user_roles").select("user_id, role");
      const { data: profiles } = await db.from("profiles").select("user_id, display_name");
      rows = (list?.users ?? []).map((u: any) => ({
        Nom: profiles?.find((p: any) => p.user_id === u.id)?.display_name ?? "—",
        "E-mail": u.email,
        Rôles: (roles ?? []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role).join(", ") || "user",
        Inscription: u.created_at?.slice(0, 10),
      }));
    } else if (data.kind === "events") {
      const { data: r } = await db.from("events").select("title, status, starts_at, location, created_at").order("created_at", { ascending: false }).limit(200);
      rows = (r ?? []).map((e: any) => ({ Titre: e.title, Statut: e.status, Date: e.starts_at?.slice(0, 10) ?? "—", Lieu: e.location ?? "—" }));
    } else if (data.kind === "invitations") {
      const { data: r } = await db.from("invitations").select("name, status, channel, sent_at, responded_at").order("created_at", { ascending: false }).limit(200);
      rows = (r ?? []).map((i: any) => ({ Invité: i.name ?? "—", Statut: i.status, Canal: i.channel ?? "email", Envoi: i.sent_at?.slice(0, 10) ?? "—", Réponse: i.responded_at?.slice(0, 10) ?? "—" }));
    } else if (data.kind === "contacts") {
      const { count } = await db.from("widget_items").select("id", { count: "exact", head: true }).eq("widget_key", "contacts-book");
      rows = [{ Indicateur: "Contacts enregistrés (total)", Valeur: count ?? 0 }];
    } else if (data.kind === "audit") {
      const { data: r } = await db.from("admin_audit_log").select("action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(200);
      rows = (r ?? []).map((a: any) => ({ Date: a.created_at?.slice(0, 16).replace("T", " "), Action: a.action, Élément: `${a.entity_type ?? ""} ${a.entity_id ?? ""}`.trim() }));
    } else if (data.kind === "extensions") {
      const { data: r } = await db.from("extensions").select("key, name, enabled, version").order("sort_order");
      rows = (r ?? []).map((e: any) => ({ key: e.key, name: e.name, enabled: e.enabled, version: e.version }));
    }
    return { rows };
  });

export const toggleExtension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().min(1), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertSuperAdmin(context as Ctx);
    const { error } = await db.from("extensions").update({ enabled: data.enabled }).eq("key", data.key);
    if (error) throw new Error("Mise à jour impossible");
    await db.from("admin_audit_log").insert({
      admin_user_id: (context as Ctx).userId,
      action: data.enabled ? "Fonctionnalité activée" : "Fonctionnalité désactivée",
      entity_type: "extension",
      entity_id: data.key,
    });
    return { ok: true };
  });
