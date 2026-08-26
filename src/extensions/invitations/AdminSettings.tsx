import { useEffect, useState } from "react";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/phone";
import { DEFAULT_INVITATIONS_CONFIG, type InvitationChannel, type InvitationsConfig } from "./config";
import { useInvitationsConfig, useSaveInvitationsConfig } from "./useInvitations";

const CHANNELS: { value: InvitationChannel; label: string; soon?: boolean }[] = [
  { value: "link", label: "Copie du lien" },
  { value: "share", label: "Partage natif" },
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS", soon: true },
  { value: "whatsapp", label: "WhatsApp", soon: true },
  { value: "push", label: "Notification push", soon: true },
];

export default function InvitationsAdminSettings() {
  const { data, isLoading } = useInvitationsConfig();
  const save = useSaveInvitationsConfig();
  const { data: eventTypes = [] } = useEventTypes();
  const [form, setForm] = useState<InvitationsConfig>(DEFAULT_INVITATIONS_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const set = <K extends keyof InvitationsConfig>(key: K, value: InvitationsConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleArray = (key: "eventTypeKeys" | "channels", value: string) =>
    setForm((f) => {
      const list = new Set(f[key] as string[]);
      if (list.has(value)) list.delete(value);
      else list.add(value);
      return { ...f, [key]: Array.from(list) as never };
    });

  const rows: { label: string; description?: string; key: keyof InvitationsConfig }[] = [
    { label: "Module obligatoire", key: "required", description: "Imposé pour les types d'événements concernés." },
    { label: "Statut « Peut-être »", key: "allowMaybe" },
    { label: "Modification de la réponse", key: "allowChangeResponse" },
    { label: "Inviter sans créer de contact", key: "inviteWithoutContact" },
    { label: "Rappels automatiques", key: "remindersEnabled" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Types d'événements concernés</Label>
        <p className="text-xs text-muted-foreground">Aucune sélection = disponible pour tous les types.</p>
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.eventTypeKeys.includes(t.key)}
                onCheckedChange={() => toggleArray("eventTypeKeys", t.key)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={String(r.key)} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm">{r.label}</p>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
            </div>
            <Switch
              checked={Boolean(form[r.key])}
              onCheckedChange={(v) => set(r.key, v as never)}
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Délai de réponse (jours avant l'événement)</Label>
          <Input
            type="number"
            min={0}
            value={form.responseDeadlineDays}
            onChange={(e) => set("responseDeadlineDays", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expiration du lien (jours, 0 = jamais)</Label>
          <Input
            type="number"
            min={0}
            value={form.expiresDays}
            onChange={(e) => set("expiresDays", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nombre maximum de rappels</Label>
          <Input
            type="number"
            min={0}
            value={form.maxReminders}
            onChange={(e) => set("maxReminders", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Canaux d'envoi</Label>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((c) => (
            <label key={c.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.channels.includes(c.value)}
                onCheckedChange={() => toggleArray("channels", c.value)}
              />
              {c.label}
              {c.soon && <span className="text-[10px] text-muted-foreground">(à venir)</span>}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Téléphone &amp; SMS</Label>
        {([
          { key: "phoneEnabled", label: "Invitation par téléphone", description: "Rechercher et inviter avec un numéro." },
          { key: "smsShareEnabled", label: "Partage SMS depuis le téléphone", description: "Ouvre l'app SMS avec le message prérempli." },
          { key: "smsAutoEnabled", label: "SMS automatisés", description: "Nécessite une extension fournisseur SMS." },
        ] as const).map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </div>
            <Switch checked={Boolean(form[r.key])} onCheckedChange={(v) => set(r.key, v as never)} />
          </div>
        ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Pays par défaut</Label>
            <select
              value={form.defaultCountry}
              onChange={(e) => set("defaultCountry", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} (+{c.dial})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Expéditeur SMS</Label>
            <Input value={form.smsSender} onChange={(e) => set("smsSender", e.target.value)} maxLength={11} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Pays autorisés (aucun coché = tous)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COUNTRIES.map((c) => (
              <label key={c.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.allowedCountries.includes(c.code)}
                  onCheckedChange={() =>
                    setForm((f) => {
                      const list = new Set(f.allowedCountries);
                      if (list.has(c.code)) list.delete(c.code);
                      else list.add(c.code);
                      return { ...f, allowedCountries: Array.from(list) };
                    })
                  }
                />
                {c.flag} {c.code}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Modèle du SMS ({"{guest}"}, {"{host}"}, {"{event}"}, {"{link}"})</Label>
          <Textarea rows={3} value={form.templateSms} onChange={(e) => set("templateSms", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visibilité des invités</Label>
        <div className="flex gap-4 text-sm">
          {(["organizer", "guests"] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.guestVisibility === v}
                onChange={() => set("guestVisibility", v)}
              />
              {v === "organizer" ? "Organisateur uniquement" : "Visible par les invités"}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Modèle d'invitation ({"{host}"}, {"{event}"})</Label>
          <Textarea
            rows={2}
            value={form.templateInvitation}
            onChange={(e) => set("templateInvitation", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modèle de rappel</Label>
          <Textarea rows={2} value={form.templateReminder} onChange={(e) => set("templateReminder", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modèle de confirmation</Label>
          <Textarea
            rows={2}
            value={form.templateConfirmation}
            onChange={(e) => set("templateConfirmation", e.target.value)}
          />
        </div>
      </div>

      <Button
        className="rounded-full"
        disabled={save.isPending}
        onClick={() =>
          save.mutate(form, {
            onSuccess: () => toast.success("Configuration enregistrée"),
            onError: (error) => toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement"),
          })
        }
      >
        Enregistrer la configuration
      </Button>
    </div>
  );
}
