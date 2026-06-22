import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  claimContributionsAsGuest,
  getInviteEventForGuest,
  INVITE_ERROR,
  respondAsGuest,
} from "@/lib/invite.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

function InvitePage() {
  const { token } = Route.useParams();
  const { g: guestId } = Route.useSearch();
  const navigate = useNavigate();
  const fetchEvent = useServerFn(getInviteEventForGuest);
  const respondFn = useServerFn(respondAsGuest);
  const claimFn = useServerFn(claimContributionsAsGuest);

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // UI states
  const [showContribStep, setShowContribStep] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [thankMessage, setThankMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!guestId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchEvent({ data: { token, guestId } })
      .then((r) => setData(r))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token, guestId, fetchEvent]);

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
  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="font-serif">Invitation introuvable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ce lien n'est plus valide ou a été supprimé par l'organisateur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const e = data.event;

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
            <ul className="divide-y">
              {data.guests.map((g) => {
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
          </CardContent>
        </Card>

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
