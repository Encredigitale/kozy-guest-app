import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — Kosy" }] }),
  component: ProfilePage,
});

type ProfileForm = {
  first_name: string;
  last_name: string;
  avatar_url: string;
  dietary_preferences: string;
  allergies: string;
  favorite_drinks: string;
  personal_notes: string;
};

const empty: ProfileForm = {
  first_name: "",
  last_name: "",
  avatar_url: "",
  dietary_preferences: "",
  allergies: "",
  favorite_drinks: "",
  personal_notes: "",
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select(
        "first_name, last_name, avatar_url, dietary_preferences, allergies, favorite_drinks, personal_notes",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            avatar_url: data.avatar_url ?? "",
            dietary_preferences: data.dietary_preferences ?? "",
            allergies: data.allergies ?? "",
            favorite_drinks: data.favorite_drinks ?? "",
            personal_notes: data.personal_notes ?? "",
          });
        }
        setLoading(false);
      });
  }, [user.id]);

  const update = (k: keyof ProfileForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error("Votre prénom est nécessaire.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        dietary_preferences: form.dietary_preferences.trim() || null,
        allergies: form.allergies.trim() || null,
        favorite_drinks: form.favorite_drinks.trim() || null,
        personal_notes: form.personal_notes.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Impossible d'enregistrer le profil.");
      return;
    }
    toast.success("Profil mis à jour.");
    navigate({ to: "/app" });
  };

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>
      <h2 className="font-serif text-3xl mb-6">Mon profil</h2>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Prénom" required>
                <Input
                  value={form.first_name}
                  onChange={(e) => update("first_name")(e.target.value)}
                  required
                />
              </Field>
              <Field label="Nom">
                <Input
                  value={form.last_name}
                  onChange={(e) => update("last_name")(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Photo (URL)" hint="Optionnel — collez l'URL d'une photo.">
              <Input
                type="url"
                placeholder="https://…"
                value={form.avatar_url}
                onChange={(e) => update("avatar_url")(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">À table</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Préférences alimentaires" hint="Ex. végétarien, sans porc…">
              <Textarea
                value={form.dietary_preferences}
                onChange={(e) => update("dietary_preferences")(e.target.value)}
              />
            </Field>
            <Field label="Allergies" hint="Ex. arachides, gluten, lactose…">
              <Textarea
                value={form.allergies}
                onChange={(e) => update("allergies")(e.target.value)}
              />
            </Field>
            <Field label="Boissons préférées" hint="Ex. vin rouge, IPA, kombucha…">
              <Textarea
                value={form.favorite_drinks}
                onChange={(e) => update("favorite_drinks")(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes personnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <Field
              label="Visible uniquement par vous"
              hint="Notez ce que vous voulez vous rappeler (anniversaires, idées cadeaux…)."
            >
              <Textarea
                rows={5}
                value={form.personal_notes}
                onChange={(e) => update("personal_notes")(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app" })}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
