import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import type { WidgetProps } from "@/core/registry/components";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { sendNotification } from "@/lib/notifications.functions";
import { useEvent, useParticipants, type EventRow } from "@/widgets/event-shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useActiveEventTypes } from "@/core/eventTypes/useEventTypes";
import {
  Trash2, Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby,
  Users, CalendarDays, Sparkles, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby, Users, CalendarDays, Sparkles,
};

export default function EventInfoWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notify = useServerFn(sendNotification);
  const { data: ev, isLoading } = useEvent(eventId);
  const { data: participants = [] } = useParticipants(eventId);
  const [draft, setDraft] = useState<EventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: eventTypes = [] } = useActiveEventTypes();

  useEffect(() => { if (ev) setDraft(ev); }, [ev]);

  const typeKey = (ev?.metadata?.event_type as string) || null;
  const typeCustomLabel = (ev?.metadata?.event_type_label as string) || null;
  const typeDef = typeKey ? eventTypes.find((t) => t.key === typeKey) : null;
  const typeLabel = typeKey === "other" ? (typeCustomLabel || "Autre") : (typeDef?.label ?? typeKey);
  const TypeIcon = typeKey === "other" ? Sparkles : (ICONS[typeDef?.icon ?? ""] ?? Sparkles);


  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!ev || !draft) return <div className="text-sm text-destructive">Événement introuvable.</div>;

  const isOrganizer = ev.organizer_id === user?.id;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("events").update({
      title: draft.title, description: draft.description, location: draft.location,
      starts_at: draft.starts_at, status: draft.status,
    }).eq("id", ev.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Enregistré.");
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  const del = async () => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success("Supprimé.");
    navigate({ to: "/app/events" });
  };

  const publish = async () => {
    const { error } = await supabase.from("events").update({ status: "published" }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    for (const p of participants.filter((x) => x.user_id)) {
      try {
        await notify({ data: { userId: p.user_id!, channel: "inapp", type: "event.published",
          title: `Nouvel événement : ${ev.title}`, body: ev.description ?? "Vous êtes invité·e.",
          metadata: { event_id: ev.id } } });
      } catch { /* silent */ }
    }
    toast.success("Publié et invités notifiés.");
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {typeKey && (
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-lg font-serif tracking-tight break-words">{ev.title}</CardTitle>
              {typeKey && <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>}
            </div>
          </div>
          <Badge className="mt-2" variant={ev.status === "published" ? "default" : "secondary"}>
            {ev.status === "published" ? "Publié" : ev.status === "archived" ? "Archivé" : "Brouillon"}
          </Badge>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            {ev.status !== "published" && <Button onClick={publish} className="rounded-full">Publier</Button>}
            <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Titre</Label>
          <Input value={draft.title} disabled={!isOrganizer} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
        <div className="space-y-2"><Label>Description</Label>
          <Textarea value={draft.description ?? ""} disabled={!isOrganizer} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0"><Label>Date de début</Label>
            <Input className="w-full min-w-0" type="datetime-local" disabled={!isOrganizer}
              value={draft.starts_at ? new Date(draft.starts_at).toISOString().slice(0, 16) : ""}
              onChange={(e) => setDraft({ ...draft, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
          <div className="space-y-2 min-w-0"><Label>Lieu</Label>
            <Input className="w-full min-w-0" value={draft.location ?? ""} disabled={!isOrganizer} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div>
        </div>
        {isOrganizer && (
          <>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as EventRow["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
