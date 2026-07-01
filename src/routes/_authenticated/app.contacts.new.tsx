import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CONTACT_GROUPS, type ContactGroup } from "@/lib/contact-groups";

export const Route = createFileRoute("/_authenticated/app/contacts/new")({
  head: () => ({ meta: [{ title: "Nouveau contact — Kosy" }] }),
  component: NewContact,
});

function NewContact() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    group_type: "friends" as ContactGroup,
    birth_date: "",
    dietary_preferences: "",
    allergies: "",
    favorite_drinks: "",
    notes: "",
  });


  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) return toast.error("Prénom obligatoire");
    if (!form.last_name.trim()) return toast.error("Nom obligatoire");
    if (!form.email.trim() && !form.phone.trim())
      return toast.error("E-mail ou téléphone requis");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return toast.error("Session expirée");
    }
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        owner_id: u.user.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        group_type: form.group_type,
        birth_date: form.birth_date || null,
        dietary_preferences: form.dietary_preferences.trim() || null,
        allergies: form.allergies.trim() || null,
        favorite_drinks: form.favorite_drinks.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact enregistré");
    navigate({ to: "/app/contacts/$contactId", params: { contactId: data.id } });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/contacts" })}>
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Nouveau contact</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                maxLength={30}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Au moins un des deux (e-mail ou téléphone) est requis.
            </p>

            <div className="space-y-1.5">
              <Label>Groupe *</Label>
              <Select
                value={form.group_type}
                onValueChange={(v) => update("group_type", v as ContactGroup)}
              >
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
              <Label htmlFor="birth_date">Date d'anniversaire</Label>
              <Input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) => update("birth_date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dietary">Préférences alimentaires</Label>
              <Input
                id="dietary"
                value={form.dietary_preferences}
                onChange={(e) => update("dietary_preferences", e.target.value)}
                maxLength={200}
                placeholder="Végétarien, sans porc…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={form.allergies}
                onChange={(e) => update("allergies", e.target.value)}
                maxLength={200}
                placeholder="Arachides, gluten…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drinks">Boisson préférée</Label>
              <Input
                id="drinks"
                value={form.favorite_drinks}
                onChange={(e) => update("favorite_drinks", e.target.value)}
                maxLength={200}
                placeholder="Vin rouge, thé glacé…"
              />
            </div>


            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes privées</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
