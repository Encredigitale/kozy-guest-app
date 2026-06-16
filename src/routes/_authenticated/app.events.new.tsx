import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { EVENT_SUBTYPES, EVENT_TYPES, type EventTypeValue } from "@/lib/event-types";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Créer un moment — Kosy" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [type, setType] = useState<EventTypeValue>("diner");
  const [subtype, setSubtype] = useState("");
  const [title, setTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [menu, setMenu] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guestEmailInput, setGuestEmailInput] = useState("");
  const [guests, setGuests] = useState<{ name: string; email: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  const subtypes = EVENT_SUBTYPES[type];

  const addGuest = () => {
    const name = guestInput.trim();
    const email = guestEmailInput.trim();
    if (!name) return;
    setGuests((g) => [...g, { name, email: email || null }]);
    setGuestInput("");
    setGuestEmailInput("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventAt) {
      toast.error("Titre et date sont obligatoires.");
      return;
    }
    setSaving(true);
    const { data: created, error } = await supabase
      .from("events")
      .insert({
        owner_id: user.id,
        event_type: type,
        event_subtype: subtype.trim() || null,
        title: title.trim(),
        event_at: new Date(eventAt).toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        menu_or_theme: menu.trim() || null,
      })
      .select("id")
      .single();
    if (error || !created) {
      setSaving(false);
      toast.error("Impossible de créer le moment.");
      return;
    }
    if (guests.length > 0) {
      await supabase
        .from("event_guests")
        .insert(guests.map((name) => ({ event_id: created.id, name })));
    }
    setSaving(false);
    toast.success("Moment créé.");
    navigate({ to: "/app/events/$eventId", params: { eventId: created.id } });
  };

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>
      <h2 className="font-serif text-3xl mb-6">Créer un moment</h2>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type d'événement *</Label>
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
                  <Input
                    placeholder="Optionnel"
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value)}
                  />
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex. Anniversaire de Léa" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date et heure *</Label>
                <Input
                  type="datetime-local"
                  value={eventAt}
                  onChange={(e) => setEventAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lieu</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresse ou nom du lieu" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quelques mots pour vos invités…" />
            </div>
            <div className="space-y-1.5">
              <Label>Menu ou thème</Label>
              <Textarea value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="Ex. soirée italienne, brunch sucré-salé…" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invités</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Prénom"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addGuest(); }
                }}
              />
              <Button type="button" variant="outline" onClick={addGuest}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
            {guests.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {guests.map((g, i) => (
                  <li key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                    {g}
                    <button
                      type="button"
                      onClick={() => setGuests((arr) => arr.filter((_, idx) => idx !== i))}
                      className="hover:text-destructive"
                      aria-label={`Retirer ${g}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Vous pourrez ajouter ou modifier les invités après création.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app" })}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer le moment
          </Button>
        </div>
      </form>
    </div>
  );
}
