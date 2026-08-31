import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Résumé léger d'une fonctionnalité pour la page événement.
 * Chaque plugin expose ici sa propre lecture minimale : le Core ne connaît
 * aucune logique métier, il se contente d'afficher la chaîne renvoyée.
 */
type SummaryFn = (eventId: string) => Promise<string | null>;

const count = async (
  table: string,
  build: (q: ReturnType<typeof supabase.from>) => unknown,
): Promise<number> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = build(supabase.from(table as never) as never);
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
};

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
    const pending = rows.filter((r) => r.status === "sent" || r.status === "opened" || r.status === "draft").length;
    return `${rows.length} invité${rows.length > 1 ? "s" : ""} · ${accepted} participe${accepted > 1 ? "nt" : ""} · ${pending} en attente`;
  },
  "ext.photos": async (eventId) => {
    const n = await count("event_photos", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("event_id", eventId).is("deleted_at", null),
    );
    return n === 0 ? "Album vide" : `${n} photo${n > 1 ? "s" : ""}`;
  },
  "ext.gifts": async (eventId) => {
    const n = await count("event_gift", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("event_id", eventId).is("deleted_at", null),
    );
    return n === 0 ? "Aucun cadeau" : `${n} cadeau${n > 1 ? "x" : ""}`;
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
    return `${rows.length} besoin${rows.length > 1 ? "s" : ""} · ${closed} couvert${closed > 1 ? "s" : ""}`;
  },
  "ext.guest-brings": async (eventId) => {
    const n = await count("guest_contributions", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("event_id", eventId),
    );
    return n === 0 ? "Rien d'annoncé" : `${n} apport${n > 1 ? "s" : ""} annoncé${n > 1 ? "s" : ""}`;
  },
  "event.menu": async (eventId) => {
    const { data, error } = await supabase
      .from("widget_items")
      .select("payload")
      .eq("widget_key", "event.menu")
      .eq("scope_type", "event")
      .eq("scope_id", eventId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return "Menu à composer";
    return `${rows.length} élément${rows.length > 1 ? "s" : ""} au menu`;
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
