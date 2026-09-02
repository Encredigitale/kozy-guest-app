import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Résumé léger d'une fonctionnalité pour la page événement.
 * Chaque plugin expose ici sa propre lecture minimale : le Core ne connaît
 * aucune logique métier, il affiche simplement le texte et la progression.
 */
export type FeatureSummaryResult = {
  /** Texte court affiché sous le nom de la fonctionnalité. */
  text: string | null;
  /** Complétion de 0 à 1 (champs renseignés / attendus). */
  progress: number;
};

type SummaryFn = (eventId: string) => Promise<FeatureSummaryResult>;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const ratio = (done: number, total: number) => (total > 0 ? Math.min(1, done / total) : 0);

const SUMMARIES: Record<string, SummaryFn> = {
  "ext.invitations": async (eventId) => {
    const { data, error } = await supabase
      .from("invitations")
      .select("status")
      .eq("event_id", eventId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return { text: "Aucun invité", progress: 0 };
    const accepted = rows.filter((r) => r.status === "accepted").length;
    const answered = rows.filter((r) =>
      ["accepted", "declined", "maybe"].includes(r.status),
    ).length;
    const pending = rows.filter((r) => ["draft", "sent", "opened"].includes(r.status)).length;
    return {
      text: `${plural(rows.length, "invité", "invités")} · ${accepted} participe${accepted > 1 ? "nt" : ""} · ${pending} en attente`,
      progress: ratio(answered, rows.length),
    };
  },
  "ext.photos": async (eventId) => {
    const { count, error } = await supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    const n = count ?? 0;
    return {
      text: n === 0 ? "Album vide" : plural(n, "photo", "photos"),
      progress: ratio(n, 10),
    };
  },
  "ext.gifts": async (eventId) => {
    const { data, error } = await supabase
      .from("event_gift")
      .select("id, gift_name")
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    const rows = data ?? [];
    const named = rows.filter((r) => (r.gift_name ?? "").trim().length > 0).length;
    return {
      text: rows.length === 0 ? "Aucun cadeau" : plural(rows.length, "cadeau", "cadeaux"),
      progress: ratio(named, Math.max(rows.length, 1)) * (rows.length === 0 ? 0 : 1),
    };
  },
  "ext.contributions": async (eventId) => {
    const { data, error } = await supabase
      .from("contribution_needs")
      .select("id, status")
      .eq("event_id", eventId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return { text: "Aucun besoin défini", progress: 0 };
    const closed = rows.filter((r) => r.status === "closed").length;
    return {
      text: `${plural(rows.length, "besoin", "besoins")} · ${closed} couvert${closed > 1 ? "s" : ""}`,
      progress: ratio(closed, rows.length),
    };
  },
  "ext.guest-brings": async (eventId) => {
    const { count, error } = await supabase
      .from("guest_contributions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    if (error) throw error;
    const n = count ?? 0;
    return {
      text: n === 0 ? "Rien d'annoncé" : plural(n, "apport annoncé", "apports annoncés"),
      progress: ratio(n, 5),
    };
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
    const filled = rows.filter((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return String(p["label"] ?? p["value"] ?? "").trim().length > 0;
    }).length;
    return {
      text: rows.length === 0 ? "Menu à composer" : plural(rows.length, "élément au menu", "éléments au menu"),
      progress: ratio(filled, 4),
    };
  },
};

export function useFeatureSummary(featureId: string, eventId: string) {
  const fn = SUMMARIES[featureId];
  return useQuery<FeatureSummaryResult>({
    queryKey: ["feature-summary", featureId, eventId],
    enabled: !!fn && !!eventId,
    staleTime: 30_000,
    queryFn: async () => (fn ? await fn(eventId) : { text: null, progress: 0 }),
  });
}

/** Couleur continue du rouge (0 %) au vert (100 %). */
export function progressColor(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  return `hsl(${Math.round(p * 120)} 72% 45%)`;
}

export function FeatureSummary({ featureId, eventId }: { featureId: string; eventId: string }) {
  const { data } = useFeatureSummary(featureId, eventId);
  if (!data?.text) return null;
  return <p className="text-sm text-muted-foreground">{data.text}</p>;
}

/** Barre de progression visuelle rouge → verte d'une fonctionnalité. */
export function FeatureProgress({ featureId, eventId }: { featureId: string; eventId: string }) {
  const { data } = useFeatureSummary(featureId, eventId);
  if (!data) return null;
  const pct = Math.round(Math.max(0, Math.min(1, data.progress)) * 100);
  const color = progressColor(data.progress);
  return (
    <div className="mt-2 space-y-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression de la fonctionnalité"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[11px] font-medium" style={{ color }}>
        {pct} % complété
      </p>
    </div>
  );
}
