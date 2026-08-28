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
  Trash2, Pencil, Calendar, MapPin, Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby,
  Users, CalendarDays, Sparkles, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby, Users, CalendarDays, Sparkles,
};

function formatDateDisplay(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

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
  const [isEditing, setIsEditing] = useState(false);
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
    setIsEditing(false);
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  const cancelEdit = () => {
    setDraft(ev);
    setIsEditing(false);
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

  const statusLabel = ev.status === "published" ? "Publié" : ev.status === "archived" ? "Archivé" : "Brouillon";

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {typeKey && (
              <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <TypeIcon className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base font-medium tracking-tight break-words">{ev.title}</CardTitle>
              {typeKey && <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={ev.status === "published" ? "default" : "secondary"}>{statusLabel}</Badge>
            {ev.status !== "published" && isOrganizer && !isEditing && (
              <Button onClick={publish} size="sm" className="rounded-full h-7 px-3 text-xs">Publier</Button>
            )}
          </div>
        </div>
        {isOrganizer && (
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)} aria-label="Modifier">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={del} aria-label="Supprimer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit} aria-label="Annuler">
                <span className="sr-only">Annuler</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!isEditing ? (
          <div className="space-y-3 text-sm">
            {ev.description ? (
              <p className="text-muted-foreground leading-relaxed line-clamp-3">{ev.description}</p>
            ) : (
              <p className="text-muted-foreground italic">Aucune description</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{formatDateDisplay(ev.starts_at)}</span>
              </div>
              {ev.location && (
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{ev.location}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Titre</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label>
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2 min-w-0"><Label>Date de début</Label>
                <Input className="w-full min-w-0" type="datetime-local"
                  value={draft.starts_at ? new Date(draft.starts_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setDraft({ ...draft, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div className="space-y-2 min-w-0"><Label>Lieu</Label>
                <Input className="w-full min-w-0" value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div>
            </div>
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
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
              <Button variant="secondary" onClick={cancelEdit} className="rounded-full">Annuler</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
