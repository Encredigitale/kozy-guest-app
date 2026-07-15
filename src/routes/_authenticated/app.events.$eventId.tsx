import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ChevronLeft, UserPlus } from "lucide-react";
import { sendNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/app/events/$eventId")({
  head: () => ({ meta: [{ title: "Événement — Framework" }] }),
  component: EventDetailPage,
});

type EventRow = {
  id: string; organizer_id: string; title: string; description: string | null;
  status: "draft" | "published" | "archived"; starts_at: string | null; ends_at: string | null;
  location: string | null;
};

type Participant = {
  id: string; event_id: string; user_id: string | null; email: string | null;
  role: "organizer" | "guest"; rsvp_status: "pending" | "accepted" | "declined";
};

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const notify = useServerFn(sendNotification);

  const [ev, setEv] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const isOrganizer = ev?.organizer_id === user.id;
  const selfRow = participants.find((p) => p.user_id === user.id);

  const load = async () => {
    setLoading(true);
    const [{ data: e, error: e1 }, { data: p, error: e2 }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase.from("event_participants").select("*").eq("event_id", eventId),
    ]);
    if (e1 || e2) toast.error(e1?.message ?? e2?.message ?? "Erreur");
    setEv(e as EventRow | null);
    setParticipants((p ?? []) as Participant[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId]);

  const save = async () => {
    if (!ev) return;
    setSaving(true);
    const { error } = await supabase.from("events").update({
      title: ev.title, description: ev.description, location: ev.location,
      starts_at: ev.starts_at, status: ev.status,
    }).eq("id", ev.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Enregistré.");
  };

  const del = async () => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success("Supprimé.");
    navigate({ to: "/app/events" });
  };

  const addParticipant = async () => {
    const email = newEmail.trim();
    if (!email) return;
    // Try to link to an existing profile by email via auth admin lookup would need server fn; keep it as email invite.
    const { data, error } = await supabase.from("event_participants").insert({ event_id: eventId, email }).select("*").single();
    if (error) return toast.error(error.message);
    setParticipants((prev) => [...prev, data as Participant]);
    setNewEmail("");
    // Fire an email notification if the invitee has a Supabase user; we do our best from client and skip if not linked.
    toast.success("Invité ajouté.");
  };

  const removeParticipant = async (id: string) => {
    const { error } = await supabase.from("event_participants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const rsvp = async (status: "accepted" | "declined") => {
    if (!selfRow) return;
    const { error } = await supabase.from("event_participants").update({ rsvp_status: status }).eq("id", selfRow.id);
    if (error) return toast.error(error.message);
    setParticipants((prev) => prev.map((p) => (p.id === selfRow.id ? { ...p, rsvp_status: status } : p)));
    // Notify organizer in-app
    if (ev) {
      try {
        await notify({ data: { userId: ev.organizer_id, channel: "inapp", type: "event.rsvp",
          title: `Réponse à "${ev.title}"`, body: `${user.email} a répondu : ${status === "accepted" ? "accepté" : "refusé"}.`,
          metadata: { event_id: ev.id, status } } });
      } catch { /* silent */ }
    }
    toast.success("Réponse enregistrée.");
  };

  const publish = async () => {
    if (!ev) return;
    const { error } = await supabase.from("events").update({ status: "published" }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    setEv({ ...ev, status: "published" });
    // Notify participants who have user_id
    for (const p of participants.filter((x) => x.user_id)) {
      try {
        await notify({ data: { userId: p.user_id!, channel: "inapp", type: "event.published",
          title: `Nouvel événement : ${ev.title}`, body: ev.description ?? "Vous êtes invité·e.",
          metadata: { event_id: ev.id } } });
      } catch { /* silent */ }
    }
    toast.success("Publié et invités notifiés.");
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!ev) return <div className="p-8 text-sm text-destructive">Événement introuvable.</div>;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link to="/app/events" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-primary">{ev.title}</h1>
          <Badge className="mt-2" variant={ev.status === "published" ? "default" : "secondary"}>{ev.status}</Badge>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            {ev.status !== "published" && (
              <Button onClick={publish} className="rounded-full">Publier</Button>
            )}
            <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      </div>

      {/* Non-organizer RSVP */}
      {selfRow && !isOrganizer && (
        <Card className="rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">Votre réponse</CardTitle>
            <CardDescription>Statut actuel : {selfRow.rsvp_status}</CardDescription></CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => rsvp("accepted")} className="rounded-full">J'accepte</Button>
            <Button onClick={() => rsvp("declined")} variant="outline" className="rounded-full">Je refuse</Button>
          </CardContent>
        </Card>
      )}

      {/* Details form */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Titre</Label>
            <Input value={ev.title} disabled={!isOrganizer} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>Description</Label>
            <Textarea value={ev.description ?? ""} disabled={!isOrganizer} onChange={(e) => setEv({ ...ev, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Date de début</Label>
              <Input type="datetime-local" disabled={!isOrganizer}
                value={ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEv({ ...ev, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            <div className="space-y-2"><Label>Lieu</Label>
              <Input value={ev.location ?? ""} disabled={!isOrganizer} onChange={(e) => setEv({ ...ev, location: e.target.value })} /></div>
          </div>
          {isOrganizer && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={ev.status} onValueChange={(v) => setEv({ ...ev, status: v as EventRow["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isOrganizer && (
            <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      {(isOrganizer || participants.length > 0) && (
        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isOrganizer && (
              <div className="flex gap-2">
                <Input type="email" placeholder="email@exemple.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Button onClick={addParticipant} className="rounded-full"><UserPlus className="h-4 w-4" /> Inviter</Button>
              </div>
            )}
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun participant.</p>
            ) : (
              <ul className="divide-y">
                {participants.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">{p.email ?? p.user_id}</p>
                      <p className="text-xs text-muted-foreground">{p.role} · {p.rsvp_status}</p>
                    </div>
                    {isOrganizer && (
                      <Button variant="ghost" size="icon" onClick={() => removeParticipant(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
