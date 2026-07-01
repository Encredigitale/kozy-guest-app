import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { EVENT_SUBTYPES, EVENT_TYPES, type EventTypeValue } from "@/lib/event-types";
import {
  CONTRIBUTION_CATEGORIES,
  contributionCategoryLabel,
  type ContributionCategory,
} from "@/lib/contribution-categories";

export const Route = createFileRoute("/_authenticated/app/events/$eventId")({
  head: () => ({ meta: [{ title: "Moment — Kosy" }] }),
  component: EventDetailPage,
});

type Guest = { id: string; name: string; email: string | null; invite_token: string };
type Rsvp = {
  id: string;
  guest_name: string;
  status: "yes" | "no" | "maybe";
  message: string | null;
  created_at: string;
};
type Contribution = {
  id: string;
  category: string;
  label: string;
  claimed_by_name: string | null;
  proposed_by_name: string | null;
};

const STATUS_LABELS: Record<Rsvp["status"], string> = {
  yes: "Oui",
  maybe: "Peut-être",
  no: "Non",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<EventTypeValue>("diner");
  const [subtype, setSubtype] = useState("");
  const [title, setTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [menu, setMenu] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [guestEmailInput, setGuestEmailInput] = useState("");
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [newContribCategory, setNewContribCategory] = useState<ContributionCategory>("plat");
  const [newContribLabel, setNewContribLabel] = useState("");

  const loadRsvps = async () => {
    const { data } = await supabase
      .from("event_rsvps")
      .select("id, guest_name, status, message, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setRsvps((data ?? []) as Rsvp[]);
  };

  const loadContribs = async () => {
    const { data } = await supabase
      .from("event_contributions")
      .select("id, category, label, claimed_by_name, proposed_by_name")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    setContributions((data ?? []) as Contribution[]);
  };

  useEffect(() => {
    (async () => {
      const [{ data: ev, error }, { data: gs }] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
        supabase
          .from("event_guests")
          .select("id, name, email, invite_token")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true }),

      ]);
      if (error || !ev) {
        toast.error("Moment introuvable.");
        navigate({ to: "/app" });
        return;
      }
      setType(ev.event_type as EventTypeValue);
      setSubtype(ev.event_subtype ?? "");
      setTitle(ev.title);
      setEventAt(toLocalInput(ev.event_at));
      setLocation(ev.location ?? "");
      setDescription(ev.description ?? "");
      setMenu(ev.menu_or_theme ?? "");
      setInviteToken(ev.invite_token);
      setGuests((gs ?? []) as Guest[]);
      await Promise.all([loadRsvps(), loadContribs()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventAt) {
      toast.error("Titre et date sont obligatoires.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({
        event_type: type,
        event_subtype: subtype.trim() || null,
        title: title.trim(),
        event_at: new Date(eventAt).toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        menu_or_theme: menu.trim() || null,
      })
      .eq("id", eventId);
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    toast.success("Moment mis à jour.");
  };

  const [inviting, setInviting] = useState(false);
  const addGuest = async () => {
    const name = guestInput.trim();
    const email = guestEmailInput.trim();
    if (!name) return;
    if (email) {
      setInviting(true);
      try {
        const { sendEventInvitation } = await import("@/lib/invitations.functions");
        const res = await sendEventInvitation({ data: { eventId, name, email } });
        setGuests((g) => [...g, res.guest as Guest]);
        setGuestInput("");
        setGuestEmailInput("");
        toast.success("Invitation envoyée !");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Envoi impossible.";
        toast.error(msg);
      } finally {
        setInviting(false);
      }
      return;
    }
    const { data, error } = await supabase
      .from("event_guests")
      .insert({ event_id: eventId, name, email: null })
      .select("id, name, email")
      .single();
    if (error || !data) {
      toast.error("Ajout impossible.");
      return;
    }
    setGuests((g) => [...g, data as Guest]);
    setGuestInput("");
    setGuestEmailInput("");
  };

  const removeGuest = async (id: string) => {
    const { error } = await supabase.from("event_guests").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setGuests((g) => g.filter((x) => x.id !== id));
  };

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    toast.success("Moment supprimé.");
    navigate({ to: "/app" });
  };

  const inviteUrl =
    typeof window !== "undefined" && inviteToken
      ? `${window.location.origin}/i/${inviteToken}`
      : "";

  const personalInviteUrl = (guestId: string) =>
    inviteUrl ? `${inviteUrl}?g=${guestId}` : "";

  const copyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Copie impossible.");
    }
  };


  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContribLabel.trim()) return;
    const { data, error } = await supabase
      .from("event_contributions")
      .insert({
        event_id: eventId,
        category: newContribCategory,
        label: newContribLabel.trim(),
      })
      .select("id, category, label, claimed_by_name, proposed_by_name")
      .single();
    if (error || !data) {
      toast.error("Ajout impossible.");
      return;
    }
    setContributions((cs) => [...cs, data as Contribution]);
    setNewContribLabel("");
  };

  const removeContribution = async (id: string) => {
    const { error } = await supabase.from("event_contributions").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setContributions((cs) => cs.filter((c) => c.id !== id));
  };

  const removeRsvp = async (id: string) => {
    const { error } = await supabase.from("event_rsvps").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setRsvps((r) => r.filter((x) => x.id !== id));
  };

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  const subtypes = EVENT_SUBTYPES[type];

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="font-serif text-3xl">{title || "Moment"}</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce moment ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est définitive. Les invités, réponses et contributions liés seront aussi supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={deleteEvent}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="mb-6 border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">Lien d'invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Partage ce lien pour que tes invités répondent et proposent ce qu'ils apportent — sans créer de compte.
          </p>
          <Button type="button" variant="outline" onClick={() => copyInvite(inviteUrl)} disabled={!inviteUrl}>
            <Copy className="h-4 w-4" /> Cliquer pour copier le lien générique
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={onSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type d'événement</Label>
                <Select value={type} onValueChange={(v) => { setType(v as EventTypeValue); setSubtype(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                {subtypes.length > 0 ? (
                  <Select value={subtype} onValueChange={setSubtype}>
                    <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                    <SelectContent>
                      {subtypes.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={subtype} onChange={(e) => setSubtype(e.target.value)} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date et heure *</Label>
                <Input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Lieu</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Menu ou thème</Label>
              <Textarea value={menu} onChange={(e) => setMenu(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Invités prévus ({guests.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Prénom"
              value={guestInput}
              onChange={(e) => setGuestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addGuest(); }
              }}
            />
            <Input
              type="email"
              placeholder="Email (optionnel)"
              value={guestEmailInput}
              onChange={(e) => setGuestEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addGuest(); }
              }}
            />
            <Button type="button" variant="outline" onClick={addGuest} disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {guestEmailInput.trim() ? "Inviter" : "Ajouter"}
            </Button>
          </div>
          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun invité noté pour le moment.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {guests.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{g.name}</p>
                    {g.email && (
                      <p className="text-xs text-muted-foreground truncate">{g.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {g.email && (
                      <button
                        type="button"
                        onClick={() => copyInvite(personalInviteUrl(g.id))}
                        className="p-1 text-muted-foreground hover:text-primary"
                        title="Copier le lien personnel"
                        aria-label={`Copier le lien personnel pour ${g.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGuest(g.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Retirer ${g.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Réponses ({rsvps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rsvps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune réponse pour l'instant.</p>
          ) : (
            <ul className="divide-y">
              {rsvps.map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.guest_name}{" "}
                      <span className={
                        r.status === "yes"
                          ? "text-xs ml-1 text-green-700"
                          : r.status === "no"
                            ? "text-xs ml-1 text-destructive"
                            : "text-xs ml-1 text-muted-foreground"
                      }>
                        · {STATUS_LABELS[r.status]}
                      </span>
                    </p>
                    {r.message && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRsvp(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer la réponse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 mb-12">
        <CardHeader>
          <CardTitle className="text-base">Contributions ({contributions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addContribution} className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
            <Select value={newContribCategory} onValueChange={(v) => setNewContribCategory(v as ContributionCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Ex. Vin rouge, salade, dessert…"
              value={newContribLabel}
              onChange={(e) => setNewContribLabel(e.target.value)}
              maxLength={120}
            />
            <Button type="submit" variant="outline">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </form>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun item demandé. Ajoute ce que tu aimerais que les invités apportent.
            </p>
          ) : (
            <ul className="divide-y">
              {contributions.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {contributionCategoryLabel(c.category)}
                      {c.proposed_by_name ? ` · proposé par ${c.proposed_by_name}` : ""}
                    </p>
                    <p className="text-sm truncate">{c.label}</p>
                    {c.claimed_by_name ? (
                      <p className="text-xs text-green-700 inline-flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" /> Apporté par {c.claimed_by_name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Pas encore pris</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContribution(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
