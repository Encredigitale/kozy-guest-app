import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  addCustomContribution,
  claimInvitationContribution,
  getInvitation,
  INVITATION_ERROR,
  respondToInvitation,
} from "@/lib/invitation.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar,
  CalendarX2,
  Check,
  Gift,
  Loader2,
  MapPin,
  PartyPopper,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { eventTypeLabel } from "@/lib/event-types";
import { contributionCategoryLabel } from "@/lib/contribution-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/invitation/$eventId/$invitationId")({
  head: () => ({ meta: [{ title: "Invitation — Kosy" }] }),
  component: InvitationPage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

type InvitationData = Awaited<ReturnType<typeof getInvitation>>;
type ErrorKind = "INVALID" | "EXPIRED" | "REVOKED" | "EVENT_MISSING" | "OTHER";

// Emoji + gradient per event type — a lightweight "illustration"
const HERO: Record<string, { emoji: string; from: string; to: string }> = {
  diner: { emoji: "🍽️", from: "from-amber-200", to: "to-rose-200" },
  dejeuner: { emoji: "🥗", from: "from-lime-200", to: "to-amber-200" },
  brunch: { emoji: "🥐", from: "from-orange-200", to: "to-yellow-100" },
  apero: { emoji: "🥂", from: "from-rose-200", to: "to-orange-200" },
  apero_dinatoire: { emoji: "🍾", from: "from-rose-200", to: "to-amber-200" },
  cremaillere: { emoji: "🏡", from: "from-emerald-200", to: "to-amber-100" },
  anniv_adulte: { emoji: "🎉", from: "from-fuchsia-200", to: "to-orange-200" },
  anniv_enfant: { emoji: "🎈", from: "from-sky-200", to: "to-rose-200" },
  noel: { emoji: "🎄", from: "from-emerald-200", to: "to-rose-200" },
  nouvel_an: { emoji: "✨", from: "from-indigo-200", to: "to-amber-200" },
  pro: { emoji: "🤝", from: "from-slate-200", to: "to-sky-100" },
  autre: { emoji: "🌿", from: "from-emerald-100", to: "to-amber-100" },
};

function heroFor(type: string) {
  return HERO[type] ?? HERO.autre;
}

function organizerName(o: InvitationData["organizer"]): string {
  const f = (o.first_name ?? "").trim();
  const l = (o.last_name ?? "").trim();
  if (f && l) return `${f} ${l.charAt(0)}.`;
  return f || l || "Votre hôte";
}

function InvitationPage() {
  const { eventId, invitationId } = Route.useParams();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const fetchInvitation = useServerFn(getInvitation);
  const respondFn = useServerFn(respondToInvitation);
  const claimFn = useServerFn(claimInvitationContribution);
  const addCustomFn = useServerFn(addCustomContribution);

  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<null | ErrorKind>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pulse, setPulse] = useState<"yes" | "no" | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  const load = () => {
    if (!token) {
      setErrorCode("INVALID");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchInvitation({ data: { eventId, invitationId, token } })
      .then((r) => setData(r))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes(INVITATION_ERROR.EXPIRED)) setErrorCode("EXPIRED");
        else if (msg.includes(INVITATION_ERROR.REVOKED)) setErrorCode("REVOKED");
        else if (msg.includes(INVITATION_ERROR.EVENT_MISSING))
          setErrorCode("EVENT_MISSING");
        else if (msg.includes(INVITATION_ERROR.INVALID)) setErrorCode("INVALID");
        else setErrorCode("OTHER");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [eventId, invitationId, token, fetchInvitation]);

  const myContribution = useMemo(
    () => data?.contributions.find((c) => c.claimed_by_me) ?? null,
    [data],
  );
  const availableContributions = useMemo(
    () => (data?.contributions ?? []).filter((c) => !c.claimed || c.claimed_by_me),
    [data],
  );

  const respond = async (status: "yes" | "no") => {
    if (!data || submitting) return;
    setPulse(status);
    setSubmitting(true);
    try {
      await respondFn({ data: { eventId, invitationId, token, status } });
      load();
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setPulse(null), 800);
    }
  };

  const pickContribution = async (id: string | null) => {
    if (!data || submitting) return;
    setSubmitting(true);
    try {
      await claimFn({ data: { eventId, invitationId, token, contributionId: id } });
      load();
    } catch {
      toast.error("Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCustom = async () => {
    if (!customLabel.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addCustomFn({
        data: { eventId, invitationId, token, label: customLabel.trim() },
      });
      setCustomMode(false);
      setCustomLabel("");
      load();
    } catch {
      toast.error("Ajout impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  // ─── Error states (distinct screens per cause) ───
  if (errorCode) {
    type Screen = {
      emoji: string;
      title: string;
      message: string;
      hint?: string;
      cta: string;
      tone: "muted" | "warm" | "cool";
    };
    const map: Record<ErrorKind, Screen> = {
      INVALID: {
        emoji: "🔒",
        title: "Lien d'invitation invalide",
        message:
          "Ce lien semble incorrect ou incomplet. Vérifiez qu'il n'a pas été tronqué en le copiant.",
        hint: "Astuce : recopiez le lien complet reçu par email ou message.",
        cta: "Retour à l'accueil",
        tone: "muted",
      },
      REVOKED: {
        emoji: "🚫",
        title: "Invitation retirée",
        message:
          "L'organisateur a retiré cette invitation. Contactez-le directement si c'est une erreur.",
        cta: "Retour à l'accueil",
        tone: "muted",
      },
      EXPIRED: {
        emoji: "⏳",
        title: "Ce lien a expiré",
        message:
          "La période de réponse est terminée. Demandez à votre hôte de renvoyer une invitation si besoin.",
        cta: "Retour à l'accueil",
        tone: "warm",
      },
      EVENT_MISSING: {
        emoji: "🗑️",
        title: "Événement supprimé",
        message:
          "L'organisateur a supprimé cet événement. Il n'est plus accessible.",
        cta: "Découvrir Kosy",
        tone: "cool",
      },
      OTHER: {
        emoji: "⚠️",
        title: "Impossible d'ouvrir cette invitation",
        message: "Une erreur inattendue est survenue. Réessayez dans un instant.",
        cta: "Retour à l'accueil",
        tone: "muted",
      },
    };
    const s = map[errorCode];
    const toneBg =
      s.tone === "warm"
        ? "from-amber-100 to-rose-100"
        : s.tone === "cool"
        ? "from-slate-100 to-sky-100"
        : "from-background to-muted/40";
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b",
          toneBg,
        )}
      >
        <Card className="max-w-md w-full text-center animate-fade-in">
          <CardContent className="pt-10 pb-8 px-6 space-y-4">
            <div className="text-6xl" aria-hidden>
              {s.emoji}
            </div>
            <h1 className="font-serif text-2xl">{s.title}</h1>
            <p className="text-sm text-muted-foreground">{s.message}</p>
            {s.hint && (
              <p className="text-xs text-muted-foreground/80 italic">{s.hint}</p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              {errorCode === "OTHER" && (
                <Button onClick={load} className="w-full">
                  <Loader2 className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              )}
              <Button
                variant={errorCode === "OTHER" ? "outline" : "default"}
                onClick={() => navigate({ to: "/" })}
                className="w-full"
              >
                {s.cta}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // ─── Finished event — dedicated screen ───
  if (data.finished) {
    const eEnded = data.event;
    const heroEnded = heroFor(eEnded.event_type);
    const dateEnded = new Date(eEnded.event_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header
          className={cn(
            "relative w-full h-40 sm:h-56 bg-gradient-to-br overflow-hidden opacity-90",
            heroEnded.from,
            heroEnded.to,
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[6rem] sm:text-[8rem]" aria-hidden>
              {heroEnded.emoji}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </header>
        <main className="max-w-md mx-auto px-4 -mt-8 pb-16 space-y-4">
          <Card className="animate-fade-in shadow-md text-center">
            <CardContent className="pt-8 pb-6 px-6 space-y-3">
              <CalendarX2 className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Événement terminé
              </p>
              <h1 className="font-serif text-2xl">{eEnded.title}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {dateEnded}
              </p>
              <p className="text-sm pt-2">
                Merci d'avoir fait partie de ce moment&nbsp;— les réponses et
                contributions sont désormais figées.
              </p>
              <div className="pt-4 space-y-2">
                <Button asChild className="w-full">
                  <Link to="/auth">Créer mon compte pour l'historique</Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/" })}
                >
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  const e = data.event;
  const hero = heroFor(e.event_type);
  const canEdit = !data.locked;
  const alreadyResponded = !!data.guest.responded_at;
  const attending = data.guest.rsvp_status === "yes";
  const dateStr = new Date(e.event_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = new Date(e.event_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const org = organizerName(data.organizer);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* ─── Hero ─── */}
      <header
        className={cn(
          "relative w-full h-56 sm:h-72 bg-gradient-to-br overflow-hidden",
          hero.from,
          hero.to,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[7rem] sm:text-[9rem] drop-shadow-sm animate-fade-in"
            aria-hidden
          >
            {hero.emoji}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </header>

      <main className="max-w-xl mx-auto px-4 -mt-10 pb-24 space-y-4">
        {/* ─── Main card ─── */}
        <Card className="animate-fade-in shadow-lg">
          <CardContent className="p-6 space-y-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {org} vous invite
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl leading-tight">
              {e.title}
            </h1>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground">
              <Sparkles className="h-3 w-3" />
              {eventTypeLabel(e.event_type)}
              {e.event_subtype ? ` · ${e.event_subtype}` : ""}
            </div>

            <div className="pt-2 space-y-3 text-sm text-left">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <p className="capitalize">{dateStr}</p>
                  <p className="text-muted-foreground">{timeStr}</p>
                </div>
              </div>
              {e.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="whitespace-pre-wrap">{e.location}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Welcome message ─── */}
        {e.description && (
          <Card className="animate-fade-in">
            <CardContent className="p-5">
              <p className="text-sm italic text-foreground/80 whitespace-pre-wrap leading-relaxed">
                « {e.description} »
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── Menu / theme ─── */}
        {e.menu_or_theme && (
          <Card className="animate-fade-in">
            <CardContent className="p-5 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Menu / thème
              </p>
              <p className="text-sm whitespace-pre-wrap">{e.menu_or_theme}</p>
            </CardContent>
          </Card>
        )}

        {/* ─── Progress card ─── */}
        <Card className="animate-fade-in">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              L'événement en un coup d'œil
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">{data.stats.totalGuests}</p>
                <p className="text-[11px] text-muted-foreground">invités</p>
              </div>
              <div>
                <Check className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">{data.stats.confirmedGuests}</p>
                <p className="text-[11px] text-muted-foreground">ont confirmé</p>
              </div>
              <div>
                <Gift className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">{data.stats.claimedContributions}</p>
                <p className="text-[11px] text-muted-foreground">contributions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── RSVP ─── */}
        <Card className="animate-fade-in">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-serif text-xl text-center">Votre présence</h2>
            {!canEdit ? (
              <p className="text-center text-sm text-muted-foreground">
                L'événement est terminé, votre réponse ne peut plus être modifiée.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => respond("yes")}
                  disabled={submitting}
                  className={cn(
                    "rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    attending
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/50",
                    pulse === "yes" && "animate-scale-in",
                  )}
                >
                  <Check className="h-6 w-6" />
                  <span className="text-sm font-medium">Je participe</span>
                </button>
                <button
                  onClick={() => respond("no")}
                  disabled={submitting}
                  className={cn(
                    "rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    data.guest.rsvp_status === "no"
                      ? "border-foreground bg-foreground text-background shadow-md"
                      : "border-border bg-card hover:border-foreground/40",
                    pulse === "no" && "animate-scale-in",
                  )}
                >
                  <X className="h-6 w-6" />
                  <span className="text-sm font-medium">Je ne pourrai pas</span>
                </button>
              </div>
            )}
            {alreadyResponded && (
              <p className="text-center text-xs text-muted-foreground">
                {attending
                  ? "Votre présence est enregistrée. Merci !"
                  : "Merci pour votre réponse."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Contributions ─── */}
        {canEdit && attending && (availableContributions.length > 0 || true) && (
          <Card className="animate-fade-in">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-serif text-xl text-center">
                Que souhaitez-vous apporter&nbsp;?
              </h2>
              <p className="text-xs text-center text-muted-foreground">
                Une seule contribution suffit.
              </p>

              <ul className="space-y-2">
                {availableContributions.map((c) => {
                  const selected = c.claimed_by_me;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => pickContribution(selected ? null : c.id)}
                        disabled={submitting}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-all",
                          "hover:border-primary/50 active:scale-[0.99]",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card",
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            selected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {selected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {contributionCategoryLabel(c.category)}
                          </p>
                          <p className="text-sm truncate">{c.label}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {!customMode ? (
                <button
                  onClick={() => setCustomMode(true)}
                  className="w-full text-sm text-primary hover:underline mt-1"
                >
                  + Je souhaite apporter autre chose
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <Input
                    placeholder="Ex : une salade, des fleurs…"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    maxLength={80}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={submitCustom}
                      disabled={submitting || customLabel.trim().length < 2}
                      className="flex-1"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Ajouter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomMode(false);
                        setCustomLabel("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Summary ─── */}
        {attending && myContribution && (
          <Card className="animate-fade-in border-primary/40 bg-primary/5">
            <CardContent className="p-5 text-center space-y-2">
              <PartyPopper className="h-6 w-6 text-primary mx-auto" />
              <h3 className="font-serif text-lg">Merci&nbsp;!</h3>
              <p className="text-sm">Votre participation est confirmée.</p>
              <p className="text-sm">
                Vous apporterez&nbsp;: <strong>{myContribution.label}</strong>
              </p>
              <p className="text-xs text-muted-foreground">À bientôt&nbsp;!</p>
            </CardContent>
          </Card>
        )}

        {/* ─── Account CTA ─── */}
        <div className="pt-4 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Retrouvez facilement vos prochaines invitations.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Créer gratuitement mon compte</Link>
          </Button>
          <p className="text-[11px] text-muted-foreground pt-4">Propulsé par Kosy</p>
        </div>
      </main>
    </div>
  );
}

// Icon shim for the "ended" empty-state (unused inline but kept for clarity)
export { CalendarX2 };
