import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Résumé léger d'une fonctionnalité pour la page événement.
 * Chaque plugin expose ici sa propre lecture minimale : le Core ne connaît
 * aucune logique métier, il affiche simplement la chaîne renvoyée.
 */
type SummaryFn = (eventId: string) => Promise<string | null>;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const SUMMARIES: Record<string, SummaryFn> = {
  "ext.invitations": async (eventId) => {
    const { data, error } = await supabase
      .from("invitations")
      .select("status")
      .eq("event_id", eventId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return "Aucun invité";
    const accepted = rows.filter((r) => r.status === "accepted").length;
    const pending = rows.filter((r) => ["draft", "sent", "opened"].includes(r.status)).length;
    return `${plural(rows.length, "invité", "invités")} · ${accepted} participe${accepted > 1 ? "nt" : ""} · ${pending} en attente`;
  },
  "ext.photos": async (eventId) => {
    const { count, error } = await supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    return (count ?? 0) === 0 ? "Album vide" : plural(count ?? 0, "photo", "photos");
  },
  "ext.gifts": async (eventId) => {
    const { count, error } = await supabase
      .from("event_gift")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    return (count ?? 0) === 0 ? "Aucun cadeau" : plural(count ?? 0, "cadeau", "cadeaux");
  },
  "ext.contributions": async (eventId) => {
    const { data, error } = await supabase
      .from("contribution_needs")
      .select("id, status")
      .eq("event_id", eventId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return "Aucun besoin défini";
    const closed = rows.filter((r) => r.status === "closed").length;
    return `${plural(rows.length, "besoin", "besoins")} · ${closed} couvert${closed > 1 ? "s" : ""}`;
  },
  "ext.guest-brings": async (eventId) => {
    const { count, error } = await supabase
      .from("guest_contributions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    if (error) throw error;
    return (count ?? 0) === 0 ? "Rien d'annoncé" : plural(count ?? 0, "apport annoncé", "apports annoncés");
  },
  "event.menu": async (eventId) => {
    const { count, error } = await supabase
      .from("widget_items")
      .select("id", { count: "exact", head: true })
      .eq("widget_key", "event.menu")
      .eq("scope_type", "event")
      .eq("scope_id", eventId);
    if (error) throw error;
    return (count ?? 0) === 0 ? "Menu à composer" : plural(count ?? 0, "élément au menu", "éléments au menu");
  },
};

export function useFeatureSummary(featureId: string, eventId: string) {
  const fn = SUMMARIES[featureId];
  return useQuery({
    queryKey: ["feature-summary", featureId, eventId],
    enabled: !!fn && !!eventId,
    staleTime: 30_000,
    queryFn: async () => (fn ? await fn(eventId) : null),
  });
}

export function FeatureSummary({ featureId, eventId }: { featureId: string; eventId: string }) {
  const { data } = useFeatureSummary(featureId, eventId);
  if (!data) return null;
  return <p className="text-sm text-muted-foreground">{data}</p>;
}
