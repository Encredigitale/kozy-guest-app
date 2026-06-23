import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  claimContributionsAsGuest,
  getInviteEventByToken,
  getInviteEventForGuest,
  identifyGuestForEvent,
  INVITE_ERROR,
  respondAsGuest,
} from "@/lib/invite.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Check, Loader2, MapPin } from "lucide-react";
import { contributionCategoryLabel } from "@/lib/contribution-categories";
import { eventTypeLabel } from "@/lib/event-types";

export const Route = createFileRoute("/i/$token")({
  head: () => ({ meta: [{ title: "Invitation — Kosy" }] }),
  component: InvitePage,
  validateSearch: (s: Record<string, unknown>) => ({
    g: typeof s.g === "string" ? s.g : "",
  }),
});

type InviteData = Awaited<ReturnType<typeof getInviteEventForGuest>>;
type GenericInviteData = Awaited<ReturnType<typeof getInviteEventByToken>>;

function InvitePage() {
  const { token } = Route.useParams();
  const { g: initialGuestId } = Route.useSearch();
  const navigate = useNavigate();
  const fetchEventByToken = useServerFn(getInviteEventByToken);
  const fetchEventForGuest = useServerFn(getInviteEventForGuest);
  const identifyGuest = useServerFn(identifyGuestForEvent);
  const respondFn = useServerFn(respondAsGuest);
  const claimFn = useServerFn(claimContributionsAsGuest);

  const [guestId, setGuestId] = useState<string>(initialGuestId);
  const [data, setData] = useState<InviteData | null>(null);
  const [genericData, setGenericData] = useState<GenericInviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<null | "INVALID" | "USED" | "OTHER">(null);
  const [submitting, setSubmitting] = useState(false);

  // Generic-link identification form state.
  const [identifyName, setIdentifyName] = useState("");
  const [identifyEmail, setIdentifyEmail] = useState("");
  const [identifying, setIdentifying] = useState(false);

  // UI states
  const [showContribStep, setShowContribStep] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [thankMessage, setThankMessage] = useState<string | null>(null);

  const handleFetchError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes(INVITE_ERROR.USED)) setErrorCode("USED");
    else if (msg.includes(INVITE_ERROR.INVALID)) setErrorCode("INVALID");
    else setErrorCode("OTHER");
  };

  useEffect(() => {
    setLoading(true);
    if (!guestId) {
      // Generic link: load public event data only.
      fetchEventByToken({ data: { token } })
        .then((r) => setGenericData(r))
        .catch(handleFetchError)
        .finally(() => setLoading(false));
      return;
    }
    // Personal link: load guest-specific data.
    fetchEventForGuest({ data: { token, guestId } })
      .then((r) => setData(r))
      .catch(handleFetchError)
      .finally(() => setLoading(false));
  }, [token, guestId, fetchEventByToken, fetchEventForGuest]);

  const onIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = identifyName.trim();
    const email = identifyEmail.trim().toLowerCase();
    if (!name || !email) {
      toast.error("Veuillez renseigner votre nom et votre email.");
      return;
    }
    setIdentifying(true);
    try {
      const { guestId: resolvedGuestId } = await identifyGuest({
        data: { token, name, email },
      });
      setGuestId(resolvedGuestId);
      setGenericData(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes(INVITE_ERROR.USED)) {
        setErrorCode("USED");
      } else if (msg.includes(INVITE_ERROR.INVALID)) {
        setErrorCode("INVALID");
      } else {
        setErrorCode("OTHER");
      }
      toast.error("Impossible de vous identifier.");
    } finally {
      setIdentifying(false);
    }
  };

  const alreadyResponded = !!data?.guest.responded_at;
  const freeContribs = useMemo(
    () => (data?.contributions ?? []).filter((c) => !c.claimed),
    [data],
  );

  const onAccept = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      await respondFn({ data: { token, guestId, status: "yes" } });
      // If there are free contributions, ask which ones they bring.
      if (freeContribs.length > 0) {
        setShowContribStep(true);
      } else {
        setThankMessage("Merci, votre participation a été enregistrée. À bientôt !");
      }
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDecline = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      await respondFn({ data: { token, guestId, status: "no" } });
      setThankMessage("Merci pour votre réponse, à bientôt !");
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validateContribs = async () => {
    if (selected.size === 0) {
      setThankMessage("Merci, votre participation a été enregistrée. À bientôt !");
      setShowContribStep(false);
      return;
    }
    setSubmitting(true);
    try {
      await claimFn({
        data: { token, guestId, contributionIds: Array.from(selected) },
      });
      setShowContribStep(false);
      setThankMessage("Merci, votre participation a été enregistrée. À bientôt !");
    } catch {
      toast.error("Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeAndGoHome = () => {
    setThankMessage(null);
    // Try to close the tab; fall back to navigating home.
    try {
      window.close();
    } catch {
      /* ignore */
    }
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (errorCode) {
    const title =
      errorCode === "USED"
        ? "Lien déjà utilisé"
        : errorCode === "OTHER"
          ? "Une erreur est survenue"
          : "Invitation introuvable";
    const message =
      errorCode === "USED"
        ? "Vous avez déjà répondu à cette invitation. Merci, à bientôt !"
        : errorCode === "OTHER"
          ? "Impossible de charger cette invitation pour le moment. Veuillez réessayer plus tard."
          : "Ce lien n'est plus valide ou a été supprimé par l'organisateur.";
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="font-serif">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button onClick={() => navigate({ to: "/" })} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const e = data?.event ?? genericData?.event;
  const guests = data?.guests ?? genericData?.guests ?? [];
  const contributions = data?.contributions ?? genericData?.contributions ?? [];

  if (!e) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="font-serif">Invitation introuvable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce lien n'est plus valide ou a été supprimé par l'organisateur.
            </p>
            <Button onClick={() => navigate({ to: "/" })} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Vous êtes invité·e
          </p>
          <h1 className="font-serif text-4xl mb-2">{e.title}</h1>
          <p className="text-sm text-muted-foreground">
            {eventTypeLabel(e.event_type)}
            {e.event_subtype ? ` · ${e.event_subtype}` : ""}
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>
                {new Date(e.event_at).toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {e.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{e.location}</span>
              </div>
            )}
            {e.description && (
              <p className="pt-2 whitespace-pre-wrap">{e.description}</p>
            )}
            {e.menu_or_theme && (
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Menu / thème
                </p>
                <p className="whitespace-pre-wrap">{e.menu_or_theme}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Invités</CardTitle>
          </CardHeader>
          <CardContent>
            {genericData && !data ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour répondre à cette invitation, indiquez qui vous êtes :
                </p>
                <form onSubmit={onIdentify} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-name">Prénom / nom</Label>
                    <Input
                      id="invite-name"
                      value={identifyName}
                      onChange={(e) => setIdentifyName(e.target.value)}
                      placeholder="Votre nom"
                      required
                      disabled={identifying}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={identifyEmail}
                      onChange={(e) => setIdentifyEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      disabled={identifying}
                    />
                  </div>
                  <Button type="submit" disabled={identifying} className="w-full">
                    {identifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continuer
                  </Button>
                </form>
                <ul className="divide-y rounded-md border">
                  {guests.map((g) => (
                    <li key={g.id} className="px-3 py-2 text-sm">
                      <p className="font-medium">{g.name}</p>
                      {g.responded_at && (
                        <p className="text-xs text-muted-foreground">
                          {g.rsvp_status === "yes"
                            ? "A accepté"
                            : g.rsvp_status === "no"
                              ? "A décliné"
                              : "A répondu"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <ul className="divide-y">
                  {data &&
                    guests.map((g) => {
                      const isMe = g.id === data.guest.id;
                      return (
                        <li
                          key={g.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {g.name}
                              {isMe && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (vous)
                                </span>
                              )}
                            </p>
                            {g.responded_at && (
                              <p className="text-xs text-muted-foreground">
                                {g.rsvp_status === "yes"
                                  ? "A accepté"
                                  : g.rsvp_status === "no"
                                    ? "A décliné"
                                    : "A répondu"}
                              </p>
                            )}
                          </div>
                          {isMe && !alreadyResponded ? (
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                onClick={onAccept}
                                disabled={submitting}
                              >
                                {submitting && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={onDecline}
                                disabled={submitting}
                              >
                                Refuser
                              </Button>
                            </div>
                          ) : isMe && alreadyResponded ? (
                            <span className="text-xs text-muted-foreground shrink-0">
                              Réponse envoyée
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
                {alreadyResponded && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">
                    Ce lien d'invitation a déjà été utilisé.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {contributions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">À apporter</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {contributions.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {contributionCategoryLabel(c.category)}
                    </p>
                    <p>{c.label}</p>
                    {c.claimed && (
                      <p className="text-xs text-muted-foreground">Déjà pris</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground py-4">
          Propulsé par Kosy
        </p>
      </div>

      {/* Step: choose contributions after accepting */}
      <Dialog open={showContribStep} onOpenChange={(o) => !o && validateContribs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Que souhaitez-vous apporter ?</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs éléments. Vous pouvez aussi valider sans rien choisir.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {freeContribs.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-md border bg-background p-3"
              >
                <Checkbox
                  id={`c-${c.id}`}
                  checked={selected.has(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                />
                <label htmlFor={`c-${c.id}`} className="flex-1 cursor-pointer">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {contributionCategoryLabel(c.category)}
                  </p>
                  <p className="text-sm">{c.label}</p>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={validateContribs} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final thank-you */}
      <Dialog
        open={!!thankMessage}
        onOpenChange={(o) => {
          if (!o) closeAndGoHome();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Merci !</DialogTitle>
            <DialogDescription>{thankMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeAndGoHome}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
