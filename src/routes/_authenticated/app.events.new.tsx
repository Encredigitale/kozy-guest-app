import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Nouvel événement — Framework" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Titre requis.");
    setSaving(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        organizer_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Erreur.");
    toast.success("Événement créé.");
    navigate({ to: "/app/events/$eventId", params: { eventId: data.id } });
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-serif text-3xl tracking-tight text-primary">Nouvel événement</h1>
      <Card className="mt-6 rounded-2xl border-border/60">
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date de début</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
              <div className="space-y-2"><Label>Lieu</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={saving} className="rounded-full">{saving ? "Création…" : "Créer"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
