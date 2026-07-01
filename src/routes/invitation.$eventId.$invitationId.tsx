import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  claimInvitationContributions,
  getInvitation,
  INVITATION_ERROR,
  respondToInvitation,
} from "@/lib/invitation.functions";
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

export const Route = createFileRoute("/invitation/$eventId/$invitationId")({
  head: () => ({ meta: [{ title: "Invitation — Kosy" }] }),
  component: InvitationPage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

type InvitationData = Awaited<ReturnType<typeof getInvitation>>;
type ErrorKind = "INVALID" | "EXPIRED" | "REVOKED" | "EVENT_MISSING" | "OTHER";

function InvitationPage() {
  const { eventId, invitationId } = Route.useParams();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const fetchInvitation = useServerFn(getInvitation);
  const respondFn = useServerFn(respondToInvitation);
  const claimFn = useServerFn(claimInvitationContributions);

  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<null | ErrorKind>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showContribStep, setShowContribStep] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [thankMessage, setThankMessage] = useState<string | null>(null);

  const load = () => {
    if (!token) {
      setErrorCode("INVALID");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchInvitation({ data: { eventId, invitationId, token } })
      .then((r) => {
        setData(r);
        setSelected(
          new Set(r.contributions.filter((c) => c.claimed_by_me).map((c) => c.id)),
        );
      })
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

  const freeContribs = useMemo(
    () => (data?.contributions ?? []).filter((c) => !c.claimed || c.claimed_by_me),
    [data],
  );

  const onAccept = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      await respondFn({ data: { eventId, invitationId, token, status: "yes" } });
      if (freeContribs.length > 0) setShowContribStep(true);
      else {
        setThankMessage("Merci, votre participation a été enregistrée. À bientôt !");
        load();
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
      await respondFn({ data: { eventId, invitationId, token, status: "no" } });
      setThankMessage("Merci pour votre réponse, à bientôt !");
      load();
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const validateContribs = async () => {
    setSubmitting(true);
    try {
      await claimFn({
        data: {
          eventId,
          invitationId,
          token,
          contributionIds: Array.from(selected),
        },
      });
      setShowContribStep(false);
      setThankMessage("Merci, votre participation a été enregistrée. À bientôt !");
      load();
    } catch {
      toast.error("Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
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
      errorCode === "EVENT_MISSING"
        ? "Événement indisponible"
        : errorCode === "EXPIRED" || errorCode === "REVOKED"
          ? "Lien expiré"
          : "Invitation introuvable";
    const message =
      errorCode === "EVENT_MISSING"
        ? "Cet événement n'est plus disponible."
        : errorCode === "EXPIRED" || errorCode === "REVOKED"
          ? "Ce lien d'invitation n'est plus valide."
          : errorCode === "OTHER"
            ? "Impossible de charger cette invitation pour le moment. Veuillez réessayer plus tard."
            : "Ce lien d'invitation n'est plus valide.";
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

  if (!data) return null;
  const e = data.event;
  const alreadyResponded = !!data.guest.responded_at;
  const canEdit = !data.locked;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Bonjour {data.guest.name}, vous êtes invité·e
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
            <CardTitle className="font-serif text-xl">Votre réponse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alreadyResponded && (
              <p className="text-sm">
                {data.guest.rsvp_status === "yes"
                  ? "Vous avez accepté cette invitation."
                  : "Vous avez décliné cette invitation."}
              </p>
            )}
            {canEdit ? (
              <div className="flex gap-2">
                <Button onClick={onAccept} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {alreadyResponded && data.guest.rsvp_status === "yes"
                    ? "Confirmer ma présence"
                    : "Accepter"}
                </Button>
                <Button variant="outline" onClick={onDecline} disabled={submitting}>
                  {alreadyResponded && data.guest.rsvp_status === "no"
                    ? "Toujours indisponible"
                    : "Refuser"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                L'événement est terminé, votre réponse ne peut plus être modifiée.
              </p>
            )}
          </CardContent>
        </Card>

        {data.contributions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">À apporter</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {data.contributions.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {contributionCategoryLabel(c.category)}
                    </p>
                    <p>{c.label}</p>
                    {c.claimed && !c.claimed_by_me && (
                      <p className="text-xs text-muted-foreground">Déjà pris</p>
                    )}
                    {c.claimed_by_me && (
                      <p className="text-xs text-primary">Vous l'apportez</p>
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && data.guest.rsvp_status === "yes" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowContribStep(true)}
                >
                  Modifier ma contribution
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground py-4">
          Propulsé par Kosy
        </p>
      </div>

      <Dialog open={showContribStep} onOpenChange={setShowContribStep}>
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

      <Dialog
        open={!!thankMessage}
        onOpenChange={(o) => !o && setThankMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Merci !</DialogTitle>
            <DialogDescription>{thankMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setThankMessage(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
