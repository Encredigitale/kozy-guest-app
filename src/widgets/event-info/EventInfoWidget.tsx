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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { EVENT_SUBTYPES, EVENT_TYPES, type EventTypeValue } from "@/lib/event-types";
import type { WidgetContext } from "@/core/widgets";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventInfoWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<EventTypeValue>("diner");
  const [subtype, setSubtype] = useState("");
  const [title, setTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [menu, setMenu] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ev, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error || !ev) {
        setLoading(false);
        return;
      }
      setType(ev.event_type as EventTypeValue);
      setSubtype(ev.event_subtype ?? "");
      setTitle(ev.title);
      setEventAt(toLocalInput(ev.event_at));
      setLocation(ev.location ?? "");
      setDescription(ev.description ?? "");
      setMenu(ev.menu_or_theme ?? "");
      setLoading(false);
    })();
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

  if (loading) return null;
  const subtypes = EVENT_SUBTYPES[type];

  return (
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
  );
}
