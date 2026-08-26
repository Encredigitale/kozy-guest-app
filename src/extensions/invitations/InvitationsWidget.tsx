import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { WidgetProps } from "@/core/registry/components";
import { useSession } from "@/core/auth/useSession";
import { useEvent } from "@/widgets/event-shared/queries";
import {
  createInvitation,
  markInvitationChannel,
  sendInvitation,
  sendInvitationSms,
} from "@/lib/invitations.functions";
import { COUNTRIES, DEFAULT_COUNTRY, looksLikePhone, maskPhone, toE164 } from "@/lib/phone";
import {
  useContactBook,
  useEventInvitations,
  useInvitationLogs,
  useInvitationsConfig,
  type InvitationRow,
} from "./useInvitations";
import { CHANNEL_LABELS, STATUS_LABELS, invitationUrl, renderSmsText, type InvitationStatus } from "./config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  History,
  Mail,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

const STATUS_STYLES: Record<InvitationStatus, string> = {
  draft: "bg-background text-muted-foreground border-border",
  sent: "bg-background text-muted-foreground border-border",
  opened: "bg-muted text-foreground border-transparent",
  accepted: "bg-secondary text-secondary-foreground border-transparent",
  declined: "bg-destructive/10 text-destructive border-destructive/20",
  maybe: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-muted text-muted-foreground border-transparent",
  expired: "bg-muted text-muted-foreground border-transparent",
};

function initials(label: string): string {
  const parts = label.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase() || "?";
}

const LOG_LABELS: Record<string, string> = {
  created: "Invitation créée",
  sent: "Invitation envoyée",
  reminder_sent: "Rappel envoyé",
  opened: "Invitation ouverte",
  responded: "Réponse enregistrée",
  contribution: "Contribution choisie",
  cancelled: "Invitation annulée",
};

export default function InvitationsWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  const { user, isAdmin } = useSession();
  const { data: ev } = useEvent(eventId);
  const { data: cfg } = useInvitationsConfig();
  const { invitations, isLoading, update, remove, invalidate } = useEventInvitations(eventId);
  const { data: contacts = [] } = useContactBook();

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [showForm, setShowForm] = useState(false);
  const [saveContact, setSaveContact] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [logsFor, setLogsFor] = useState<InvitationRow | null>(null);
  const { data: logs = [] } = useInvitationLogs(logsFor?.id ?? null);

  const addInvitation = useServerFn(createInvitation);
  const send = useServerFn(sendInvitation);
  const markChannel = useServerFn(markInvitationChannel);
  const sendSms = useServerFn(sendInvitationSms);

  const isOrganizer = !!ev && !!user && ev.organizer_id === user.id;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const searchIsPhone = looksLikePhone(search);
  const searchE164 = searchIsPhone ? toE164(search, cfg?.defaultCountry ?? country) : null;

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const qDigits = q.replace(/\D/g, "");
    return contacts
      .filter((c) => {
        const haystack = `${c.name} ${c.email}`.toLowerCase();
        if (haystack.includes(q)) return true;
        if (!qDigits) return false;
        const cDigits = `${c.phone} ${c.phoneE164}`.replace(/\D/g, "");
        return cDigits.includes(qDigits);
      })
      .filter((c) => !invitations.some((i) => i.contact_id === c.id || (c.email && i.email === c.email)))
      .slice(0, 5);
  }, [contacts, search, invitations]);

  const recent = useMemo(
    () => contacts.filter((c) => !invitations.some((i) => i.contact_id === c.id)).slice(-3).reverse(),
    [contacts, invitations],
  );

  const counts = useMemo(() => {
    const by = (s: InvitationStatus) => invitations.filter((i) => i.status === s).length;
    return {
      total: invitations.length,
      accepted: by("accepted"),
      declined: by("declined"),
      maybe: by("maybe"),
      pending: invitations.filter((i) => ["draft", "sent", "opened"].includes(i.status)).length,
    };
  }, [invitations]);

  const add = async (input: {
    name?: string;
    email?: string;
    phone?: string;
    contactId?: string | null;
    save: boolean;
  }) => {
    setAdding(true);
    try {
      const result = await addInvitation({
        data: {
          eventId,
          name: input.name || undefined,
          email: input.email || undefined,
          phone: input.phone || undefined,
          country,
          contactId: input.contactId ?? null,
          saveToContacts: input.save,
        },
      });
      setSearch("");
      setName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      invalidate();

      const created = result.invitation as unknown as InvitationRow;
      if (created.email) {
        try {
          await send({ data: { invitationId: created.id } });
          toast.success("Invitation envoyée.");
        } catch (error) {
          toast.error("Invité ajouté, mais l'e-mail n'a pas pu être envoyé.", {
            description: error instanceof Error ? error.message : undefined,
          });
        }
        invalidate();
      } else {
        toast.success("Invité ajouté. Partagez son lien d'invitation.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'ajouter cet invité.");
    } finally {
      setAdding(false);
    }
  };

  const resend = async (inv: InvitationRow, reminder = false) => {
    setBusyId(inv.id);
    try {
      await send({ data: { invitationId: inv.id, reminder } });
      toast.success(reminder ? "Rappel envoyé." : "Invitation envoyée.");
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const link = (inv: InvitationRow) => invitationUrl(origin, inv.event_id, inv.id, inv.token);

  const track = async (inv: InvitationRow, channel: "link" | "share" | "sms" | "whatsapp") => {
    try {
      await markChannel({
        data: {
          invitationId: inv.id,
          channel,
          event: channel === "sms" ? "sms_requested" : "link_shared",
        },
      });
      invalidate();
    } catch {
      /* le suivi ne bloque jamais le partage */
    }
  };

  const smsText = (inv: InvitationRow) =>
    renderSmsText(cfg?.templateSms ?? "{guest}, {host} vous invite à {event} : {link}", {
      guest: inv.name ?? "",
      host: user?.user_metadata?.display_name ?? "Un proche",
      event: ev?.title ?? "un événement",
      link: link(inv),
    });

  const copy = async (inv: InvitationRow) => {
    await navigator.clipboard.writeText(link(inv));
    toast.success("Lien copié.");
    track(inv, "link");
  };

  const share = async (inv: InvitationRow) => {
    const url = link(inv);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: ev?.title ?? "Invitation", text: smsText(inv), url });
        track(inv, "share");
        return;
      } catch {
        /* partage annulé */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié.");
    track(inv, "link");
  };

  /** MVP : ouvre l'app SMS du téléphone avec destinataire et texte préremplis. */
  const shareBySms = (inv: InvitationRow) => {
    const to = inv.phone_e164 ?? inv.phone ?? "";
    window.location.href = `sms:${to}?&body=${encodeURIComponent(smsText(inv))}`;
    track(inv, "sms");
  };

  const shareByWhatsapp = (inv: InvitationRow) => {
    const to = (inv.phone_e164 ?? "").replace(/\D/g, "");
    const url = to
      ? `https://wa.me/${to}?text=${encodeURIComponent(smsText(inv))}`
      : `https://wa.me/?text=${encodeURIComponent(smsText(inv))}`;
    window.open(url, "_blank", "noopener");
    track(inv, "whatsapp");
  };

  /** Envoi SMS automatisé via le service de messagerie (si un fournisseur est connecté). */
  const autoSms = async (inv: InvitationRow) => {
    setBusyId(inv.id);
    try {
      const result = await sendSms({ data: { invitationId: inv.id } });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi SMS impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (inv: InvitationRow) =>
    update.mutate(
      { id: inv.id, patch: { status: "cancelled", revoked_at: new Date().toISOString() } },
      { onSuccess: () => toast.success("Invitation annulée.") },
    );


  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  const visible = isOrganizer || isAdmin || cfg?.guestVisibility === "guests";
  if (!visible) return null;

  const channels = cfg?.channels ?? ["link", "share", "email"];

  return (
    <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Invités &amp; invitations
          </CardTitle>
          <Badge variant="secondary" className="rounded-full font-medium">
            {counts.accepted} / {counts.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            { label: "invités", value: counts.total },
            { label: "participent", value: counts.accepted },
            { label: "refus", value: counts.declined },
            { label: "en attente", value: counts.pending },
            ...(cfg?.allowMaybe ? [{ label: "peut-être", value: counts.maybe }] : []),
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-background p-3">
              <p className="text-lg font-medium leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {isOrganizer && (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-3">
            <div className="relative">
              <Input
                placeholder="Rechercher dans mon carnet d'adresses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-2xl h-11"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() => add({ name: c.name, email: c.email, contactId: c.id, save: false })}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                      >
                        <Avatar className="h-9 w-9">
                          {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
                          <AvatarFallback>{initials(c.name || c.email)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{c.name || c.email}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[c.email, c.phone, c.group].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">Ajouter</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Prénom et nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl h-11"
              />
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl h-11"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {cfg?.inviteWithoutContact ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-contact"
                    checked={saveContact}
                    onCheckedChange={(v) => setSaveContact(v === true)}
                  />
                  <Label htmlFor="save-contact" className="text-xs text-muted-foreground">
                    Enregistrer dans mes contacts
                  </Label>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Le contact sera enregistré dans le carnet.</span>
              )}
              <Button
                onClick={() => add({ name, email, save: cfg?.inviteWithoutContact ? saveContact : true })}
                disabled={adding || (!name.trim() && !email.trim())}
                className="rounded-full h-11 px-4"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {saveContact || !cfg?.inviteWithoutContact ? "Créer et inviter" : "Inviter"}
              </Button>
            </div>
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucune invitation pour le moment.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {invitations.map((inv) => {
              const label = inv.name || inv.email || "Invité";
              return (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{initials(label)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium truncate">
                      {label}
                      {inv.guest_user_id && (
                        <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                          Membre
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{inv.email ?? "Sans e-mail"}</p>
                  </div>
                  <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${STATUS_STYLES[inv.status]}`}>
                    {inv.status === "draft" ? "Invitation non envoyée" : STATUS_LABELS[inv.status]}
                  </Badge>

                  {(isOrganizer || isAdmin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={busyId === inv.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <a href={link(inv)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> Voir l'invitation
                          </a>
                        </DropdownMenuItem>
                        {channels.includes("email") && inv.email && (
                          <>
                            <DropdownMenuItem onClick={() => resend(inv)}>
                              <Send className="h-4 w-4 mr-2" /> Renvoyer l'invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resend(inv, true)}>
                              <Mail className="h-4 w-4 mr-2" /> Envoyer un rappel
                            </DropdownMenuItem>
                          </>
                        )}
                        {channels.includes("link") && (
                          <DropdownMenuItem onClick={() => copy(inv)}>
                            <Copy className="h-4 w-4 mr-2" /> Copier le lien
                          </DropdownMenuItem>
                        )}
                        {channels.includes("share") && (
                          <DropdownMenuItem onClick={() => share(inv)}>
                            <Share2 className="h-4 w-4 mr-2" /> Partager
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setLogsFor(inv)}>
                          <History className="h-4 w-4 mr-2" /> Historique &amp; réponse
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {inv.status !== "cancelled" && (
                          <DropdownMenuItem onClick={() => cancel(inv)}>
                            <XCircle className="h-4 w-4 mr-2" /> Annuler l'invitation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove.mutate(inv.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!logsFor} onOpenChange={(open) => !open && setLogsFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{logsFor?.name || logsFor?.email || "Invitation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Réponse :{" "}
              <span className="font-medium">
                {logsFor ? STATUS_LABELS[logsFor.status] : "—"}
              </span>
            </p>
            <ul className="space-y-1 text-sm">
              {logs.length === 0 && <li className="text-muted-foreground">Aucun événement enregistré.</li>}
              {logs.map((l) => (
                <li key={l.id} className="flex gap-3">
                  <span className="text-muted-foreground tabular-nums">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(l.created_at),
                    )}
                  </span>
                  <span>
                    {LOG_LABELS[l.event_type] ?? l.event_type}
                    {l.event_type === "responded" && l.metadata?.response
                      ? ` — ${STATUS_LABELS[l.metadata.response as InvitationStatus]}`
                      : ""}
                    {l.event_type === "contribution" && l.metadata?.text ? ` — ${String(l.metadata.text)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
