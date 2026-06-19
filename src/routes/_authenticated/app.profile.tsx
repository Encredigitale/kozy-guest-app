import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — Kosy" }] }),
  component: ProfilePage,
});

type ProfileForm = {
  first_name: string;
  last_name: string;
  phone: string;
  birth_date: string;
  avatar_url: string;
  dietary_preferences: string;
  allergies: string;
  favorite_drinks: string;
  personal_notes: string;
};

const empty: ProfileForm = {
  first_name: "",
  last_name: "",
  phone: "",
  birth_date: "",
  avatar_url: "",
  dietary_preferences: "",
  allergies: "",
  favorite_drinks: "",
  personal_notes: "",
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select(
        "first_name, last_name, phone, birth_date, avatar_url, dietary_preferences, allergies, favorite_drinks, personal_notes",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            phone: data.phone ?? "",
            birth_date: data.birth_date ?? "",
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

  useEffect(() => {
    let cancelled = false;
    if (!form.avatar_url) {
      setAvatarPreview(null);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(form.avatar_url, 3600)
      .then(({ data }) => {
        if (!cancelled) setAvatarPreview(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [form.avatar_url]);

  const update = (k: keyof ProfileForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisissez un fichier image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image trop volumineuse (5 Mo max).");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploadingAvatar(false);
      toast.error("Échec du téléversement.");
      return;
    }
    // Remove previous avatar object if it was in our bucket
    if (form.avatar_url && form.avatar_url.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([form.avatar_url]);
    }
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploadingAvatar(false);
    if (dbErr) {
      toast.error("Photo téléversée, mais profil non mis à jour.");
      return;
    }
    setForm((f) => ({ ...f, avatar_url: path }));
    toast.success("Photo mise à jour.");
  };

  const removeAvatar = async () => {
    if (!form.avatar_url) return;
    setUploadingAvatar(true);
    if (form.avatar_url.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([form.avatar_url]);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    setUploadingAvatar(false);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setForm((f) => ({ ...f, avatar_url: "" }));
    toast.success("Photo retirée.");
  };

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
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
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

  const initials =
    (form.first_name?.[0] ?? "") + (form.last_name?.[0] ?? "") || "?";

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
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="" />}
                <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {form.avatar_url ? "Changer" : "Téléverser une photo"}
                  </Button>
                  {form.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG ou PNG, 5 Mo max. Visible uniquement par vous.
                </p>
              </div>
            </div>

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
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Téléphone">
                <Input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={form.phone}
                  onChange={(e) => update("phone")(e.target.value)}
                />
              </Field>
              <Field label="Date de naissance">
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => update("birth_date")(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </Field>
            </div>
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
