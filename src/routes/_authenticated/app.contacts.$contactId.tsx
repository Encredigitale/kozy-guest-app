import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { CONTACT_GROUPS, contactGroupLabel } from "@/lib/contact-groups";

export const Route = createFileRoute("/_authenticated/app/contacts/$contactId")({
  head: () => ({ meta: [{ title: "Contact — Kosy" }] }),
  component: ContactDetail,
});

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  group_type: string;
  avatar_url: string | null;
  notes: string | null;
  dietary_preferences: string | null;
  allergies: string | null;
  favorite_drinks: string | null;
  linked_user_id: string | null;
  invited_count: number;
  last_invited_at: string | null;
  last_attended_at: string | null;
  last_contribution: string | null;
};

function ContactDetail() {
  const { contactId } = useParams({ from: "/_authenticated/app/contacts/$contactId" });
  const navigate = useNavigate();
  const [c, setC] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .maybeSingle();
      if (error || !data) toast.error("Contact introuvable");
      else setC(data as Contact);
      setLoading(false);
    })();
  }, [contactId]);

  const patch = (p: Partial<Contact>) => setC((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async () => {
    if (!c) return;
    if (!c.first_name.trim()) return toast.error("Prénom obligatoire");
    if (!c.email?.trim() && !c.phone?.trim())
      return toast.error("E-mail ou téléphone requis");
    setSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        first_name: c.first_name.trim(),
        last_name: c.last_name?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        birth_date: c.birth_date || null,
        group_type: c.group_type as "family" | "friends" | "colleagues" | "neighbors" | "other",
        notes: c.notes?.trim() || null,
        dietary_preferences: c.dietary_preferences?.trim() || null,
        allergies: c.allergies?.trim() || null,
        favorite_drinks: c.favorite_drinks?.trim() || null,
      })
      .eq("id", c.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Contact mis à jour");
  };

  const remove = async () => {
    if (!c || !confirm("Supprimer ce contact ?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Contact supprimé");
    navigate({ to: "/app/contacts" });
  };

  if (loading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (!c) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/contacts" })}>
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarImage src={c.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">
              {c.first_name[0]}
              {c.last_name?.[0] ?? ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="font-serif text-2xl">
              {c.first_name} {c.last_name ?? ""}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{contactGroupLabel(c.group_type)}</Badge>
              {c.linked_user_id ? (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Membre
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Contact local
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Invité :</span>{" "}
              <strong>{c.invited_count}</strong> fois
            </p>
            {c.last_invited_at && (
              <p>
                <span className="text-muted-foreground">Dernière invitation :</span>{" "}
                {new Date(c.last_invited_at).toLocaleDateString("fr-FR")}
              </p>
            )}
            {c.last_attended_at && (
              <p>
                <span className="text-muted-foreground">Dernière participation :</span>{" "}
                {new Date(c.last_attended_at).toLocaleDateString("fr-FR")}
              </p>
            )}
            {c.last_contribution && (
              <p>
                <span className="text-muted-foreground">Contribution fréquente :</span>{" "}
                {c.last_contribution}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input value={c.first_name} onChange={(e) => patch({ first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={c.last_name ?? ""} onChange={(e) => patch({ last_name: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={c.email ?? ""} onChange={(e) => patch({ email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input type="tel" value={c.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date d'anniversaire</Label>
            <Input
              type="date"
              value={c.birth_date ?? ""}
              onChange={(e) => patch({ birth_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Groupe</Label>
            <Select value={c.group_type} onValueChange={(v) => patch({ group_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_GROUPS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Préférences alimentaires</Label>
            <Input
              value={c.dietary_preferences ?? ""}
              onChange={(e) => patch({ dietary_preferences: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Allergies</Label>
            <Input
              value={c.allergies ?? ""}
              onChange={(e) => patch({ allergies: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Boissons préférées</Label>
            <Input
              value={c.favorite_drinks ?? ""}
              onChange={(e) => patch({ favorite_drinks: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes privées</Label>
            <Textarea
              value={c.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
            <Button variant="outline" onClick={remove} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate({ to: "/app/events/new" })}
          >
            <CalendarPlus className="h-4 w-4" />
            Inviter à un événement
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
