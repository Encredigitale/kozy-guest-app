import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/alert-dialog";
import {
  Camera,
  Download,
  Loader2,
  Lock,
  
  ShieldCheck,
  Trash2,
  UserCircle2,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { COUNTRIES, DEFAULT_COUNTRY, formatPhone } from "@/lib/phone";
import { deleteMyAccount, exportMyData } from "@/lib/user-account.functions";
import {
  fieldStatus,
  useAvatarUrl,
  useLegalDocuments,
  useProfileFieldConfig,
  useReferentials,
  useUserProfile,
} from "./useUserProfile";
import { SelectionEditor } from "./SelectionEditor";
import { DOC_LABELS } from "./types";

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user } = useSession();
  const {
    profile,
    consents,
    foodPreferences,
    allergies,
    isLoading,
    saveIdentity,
    saveSelections,
    uploadAvatar,
    removeAvatar,
  } = useUserProfile();
  const { data: refs } = useReferentials();
  const { data: config } = useProfileFieldConfig();
  const { data: legal } = useLegalDocuments();
  const avatarUrl = useAvatarUrl(profile?.profile_picture_path);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editIdentity, setEditIdentity] = useState(false);
  const [editFood, setEditFood] = useState(false);
  const [editAllergies, setEditAllergies] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", nickname: "", phone: "", country: DEFAULT_COUNTRY });
  
  const [pwdBusy, setPwdBusy] = useState(false);
  const [deleteState, setDeleteState] = useState({ open: false, password: "", busy: false });

  const phoneHidden = fieldStatus(config, "phone") === "hidden";
  const photoHidden = fieldStatus(config, "profile_picture") === "hidden";
  const foodHidden = fieldStatus(config, "food_preferences") === "hidden";
  const allergiesHidden = fieldStatus(config, "allergies") === "hidden";

  const openIdentity = () => {
    setForm({
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      nickname: String((profile?.extra as Record<string, unknown> | undefined)?.nickname ?? ""),
      phone: profile?.phone ?? "",
      country: DEFAULT_COUNTRY,
    });
    setEditIdentity(true);
  };

  const labelFor = (list: { id: string; label: string }[] | undefined, id: string | null) =>
    list?.find((i) => i.id === id)?.label ?? "—";

  const latestConsent = (type: "terms" | "privacy") =>
    consents.find((c) => c.consent_type === type) ?? null;

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Photo mise à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléversement impossible");
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    setPwdBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPwdBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Un lien de modification du mot de passe vous a été envoyé.");
  };


  const onExport = async () => {
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mes-donnees-kozy.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export impossible pour le moment.");
    }
  };

  const onDelete = async () => {
    if (!user?.email) return;
    setDeleteState((p) => ({ ...p, busy: true }));
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deleteState.password,
    });
    if (error) {
      setDeleteState((p) => ({ ...p, busy: false }));
      return toast.error("Mot de passe incorrect.");
    }
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteState((p) => ({ ...p, busy: false }));
      toast.error("Suppression impossible pour le moment.");
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="p-6 sm:p-8 max-w-2xl space-y-5">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Mon profil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vos informations personnelles, vos préférences et vos consentements.
        </p>
      </div>

      {!photoHidden && (
        <Section title="Photo" description="Votre avatar, visible par vos proches." icon={<Camera className="h-4 w-4" />}>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden grid place-items-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-9 w-9 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={uploadAvatar.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadAvatar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {profile?.profile_picture_path ? "Remplacer" : "Ajouter une photo"}
              </Button>
              {profile?.profile_picture_path && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => removeAvatar.mutate()}
                >
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </Section>
      )}

      <Section title="Informations personnelles" icon={<UserCircle2 className="h-4 w-4" />}>
        {editIdentity ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveIdentity.mutateAsync({
                  first_name: form.first_name,
                  last_name: form.last_name,
                  nickname: form.nickname,
                  ...(phoneHidden ? {} : { phone: form.phone, countryCode: form.country }),
                });
                setEditIdentity(false);
                toast.success("Informations enregistrées.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first">Prénom *</Label>
                <Input id="first" required maxLength={80} value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Nom *</Label>
                <Input id="last" required maxLength={80} value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Pseudo</Label>
              <Input
                id="nickname"
                maxLength={40}
                placeholder="Le nom affiché aux autres participants"
                value={form.nickname}
                onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
              />
            </div>
            {!phoneHidden && (
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="flex gap-2">
                  <Select value={form.country} onValueChange={(v) => setForm((p) => ({ ...p, country: v }))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.dial}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input id="phone" className="flex-1" value={form.phone} placeholder="06 12 34 56 78" onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setEditIdentity(false)}>Annuler</Button>
              <Button type="submit" className="rounded-full" disabled={saveIdentity.isPending}>
                {saveIdentity.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}Enregistrer
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Prénom" value={profile?.first_name} />
            <Row label="Nom" value={profile?.last_name} />
            <Row
              label="Pseudo"
              value={String((profile?.extra as Record<string, unknown> | undefined)?.nickname ?? "") || null}
            />
            <Row label="E-mail" value={user?.email} />
            {!phoneHidden && (
              <Row
                label="Téléphone"
                value={profile?.phone ? formatPhone(profile.phone, profile.phone_normalized) : null}
                extra={
                  profile?.phone ? (
                    <Badge variant={profile.phone_verified ? "default" : "secondary"} className="ml-2 text-[10px]">
                      {profile.phone_verified ? "Vérifié" : "Non vérifié"}
                    </Badge>
                  ) : null
                }
              />
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={openIdentity}>Modifier</Button>
            </div>
          </div>
        )}
      </Section>

      {!foodHidden && (
        <Section title="Mes préférences alimentaires" description="Visibles uniquement par les modules autorisés." icon={<Utensils className="h-4 w-4" />}>
          {editFood ? (
            <SelectionEditor
              items={refs?.foodPreferences ?? []}
              selected={foodPreferences}
              saving={saveSelections.isPending}
              onCancel={() => setEditFood(false)}
              onSave={async (values) => {
                await saveSelections.mutateAsync({ table: "food", selected: values });
                setEditFood(false);
                toast.success("Préférences enregistrées.");
              }}
            />
          ) : (
            <div className="space-y-3">
              {foodPreferences.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune préférence renseignée.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {foodPreferences.map((s) => (
                    <Badge key={s.id} variant="secondary" className="rounded-full">
                      {labelFor(refs?.foodPreferences, s.refId)}
                      {s.custom_value ? ` · ${s.custom_value}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditFood(true)}>Modifier</Button>
            </div>
          )}
        </Section>
      )}

      {!allergiesHidden && (
        <Section title="Mes allergies" description="Information sensible, jamais partagée automatiquement." icon={<AlertTriangle className="h-4 w-4" />}>
          {editAllergies ? (
            <SelectionEditor
              items={refs?.allergies ?? []}
              selected={allergies}
              saving={saveSelections.isPending}
              onCancel={() => setEditAllergies(false)}
              onSave={async (values) => {
                await saveSelections.mutateAsync({ table: "allergy", selected: values });
                setEditAllergies(false);
                toast.success("Allergies enregistrées.");
              }}
            />
          ) : (
            <div className="space-y-3">
              {allergies.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune allergie renseignée.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((s) => (
                    <Badge key={s.id} variant="secondary" className="rounded-full">
                      {labelFor(refs?.allergies, s.refId)}
                      {s.custom_value ? ` · ${s.custom_value}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditAllergies(true)}>Modifier</Button>
            </div>
          )}
        </Section>
      )}

      <Section title="Sécurité" icon={<Lock className="h-4 w-4" />}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-medium">Mot de passe</p>
            <p className="text-muted-foreground text-xs">Géré par le système d'authentification.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-full sm:w-auto sm:shrink-0"
            disabled={pwdBusy}
            onClick={changePassword}
          >
            {pwdBusy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}Modifier mon mot de passe
          </Button>
        </div>
      </Section>

      <Section title="Documents et consentements" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="space-y-3 text-sm">
          {(["terms", "privacy"] as const).map((type) => {
            const consent = latestConsent(type);
            return (
              <div key={type} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{DOC_LABELS[type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {consent
                      ? `Acceptée – version ${consent.document_version} le ${new Date(consent.accepted_at).toLocaleDateString("fr-FR")}`
                      : "Aucune acceptation enregistrée"}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <Link to="/legal/$docType" params={{ docType: type }}>Consulter</Link>
                </Button>
              </div>
            );
          })}
          {legal && consents.length > 1 && (
            <>
              <Separator />
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Historique des acceptations</summary>
                <ul className="mt-2 space-y-1">
                  {consents.map((c) => (
                    <li key={c.id}>
                      {DOC_LABELS[c.consent_type]} · v{c.document_version} ·{" "}
                      {new Date(c.accepted_at).toLocaleString("fr-FR")}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      </Section>

      <Section title="Mon compte" icon={<Trash2 className="h-4 w-4" />}>
        <div className="space-y-3">
          <Button size="sm" variant="outline" className="rounded-full" onClick={onExport}>
            <Download className="h-3.5 w-3.5 mr-1" />Télécharger mes données
          </Button>
          <div>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={() => setDeleteState({ open: true, password: "", busy: false })}
            >
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </Section>

      <AlertDialog open={deleteState.open} onOpenChange={(o) => setDeleteState((p) => ({ ...p, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement mon compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos informations personnelles seront supprimées. Les événements partagés avec d'autres
              utilisateurs sont conservés mais votre participation y sera anonymisée. Confirmez avec
              votre mot de passe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Mot de passe"
            value={deleteState.password}
            onChange={(e) => setDeleteState((p) => ({ ...p, password: e.target.value }))}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteState.busy || deleteState.password.length < 6}
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value, extra }: { label: string; value?: string | null; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">
        {value || <span className="text-muted-foreground font-normal">—</span>}
        {extra}
      </span>
    </div>
  );
}
