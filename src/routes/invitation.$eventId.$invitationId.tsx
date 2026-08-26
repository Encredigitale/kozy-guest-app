import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getPublicInvitation,
  respondToInvitation,
  savePublicContribution,
} from "@/lib/invitations.functions";
import type { PublicInvitationPayload } from "@/extensions/invitations/public-types";
import GuestBringsBlock from "@/extensions/guest-brings/GuestBringsBlock";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, Check, HelpCircle, Loader2, MapPin, PartyPopper, X } from "lucide-react";

export const Route = createFileRoute("/invitation/$eventId/$invitationId")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Votre invitation — Kosy" },
      { name: "description", content: "Consultez votre invitation et répondez en un clic, sans créer de compte." },
      { property: "og:title", content: "Votre invitation — Kosy" },
      { property: "og:description", content: "Consultez votre invitation et répondez en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicInvitationPage,
});

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Cette invitation n'est plus disponible.",
  expired: "Le délai de réponse à cette invitation est terminé.",
  cancelled_event: "Cet événement a été annulé.",
  deleted: "Cette invitation n'est plus valide.",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(iso));
}

function PublicInvitationPage() {
  const { eventId, invitationId } = Route.useParams();
  const { token } = Route.useSearch();
  const load = useServerFn(getPublicInvitation);
  const respond = useServerFn(respondToInvitation);
  const saveContribution = useServerFn(savePublicContribution);

  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error"; code: string } | { kind: "ok"; payload: PublicInvitationPayload }
  >({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [contribution, setContribution] = useState("");

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", code: "invalid_token" });
      return;
    }
    let cancelled = false;
    load({ data: { eventId, invitationId, token } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setState({ kind: "ok", payload: result.payload });
          setContribution(result.payload.contribution ?? "");
        } else setState({ kind: "error", code: result.error });
      })
      .catch(() => !cancelled && setState({ kind: "error", code: "invalid_token" }));
    return () => {
      cancelled = true;
    };
  }, [eventId, invitationId, token, load]);

  const answer = async (response: "accepted" | "declined" | "maybe") => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await respond({ data: { eventId, invitationId, token, response } });
      if (result.ok) {
        setState({ kind: "ok", payload: result.payload });
        toast.success("Votre réponse est enregistrée.");
      } else {
        toast.error(ERROR_MESSAGES[result.error] ?? "Réponse impossible.");
      }
    } catch {
      toast.error("Réponse impossible.");
    } finally {
      setBusy(false);
    }
  };

  const submitContribution = async () => {
    if (!token || !contribution.trim()) return;
    setBusy(true);
    try {
      const result = await saveContribution({ data: { eventId, invitationId, token, text: contribution.trim() } });
      if (result.ok) {
        setState({ kind: "ok", payload: result.payload });
        toast.success("Merci, c'est noté !");
      }
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre invitation…
        </p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card className="w-full max-w-md rounded-3xl border-border/60 text-center">
          <CardContent className="p-8 space-y-4">
            <h1 className="font-serif text-2xl">{ERROR_MESSAGES[state.code] ?? ERROR_MESSAGES.deleted}</h1>
            <p className="text-sm text-muted-foreground">
              Contactez l'organisateur pour obtenir un nouveau lien.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const p = state.payload;
  const answered = ["accepted", "declined", "maybe"].includes(p.status);
  const canAnswer = !p.responseClosed && (!answered || p.config.allowChangeResponse);

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center space-y-3">
          {p.event.typeLabel && (
            <Badge variant="secondary" className="rounded-full">
              {p.event.typeLabel}
            </Badge>
          )}
          <h1 className="font-serif text-4xl leading-tight">{p.event.title}</h1>
          {p.event.organizerName && (
            <p className="text-sm text-muted-foreground">Invitation de {p.event.organizerName}</p>
          )}
        </header>

        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-6 space-y-3 text-sm">
            {p.event.startsAt && (
              <p className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 mt-0.5 text-primary" />
                {formatDate(p.event.startsAt)}
              </p>
            )}
            {p.event.location && (
              <p className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                {p.event.location}
              </p>
            )}
            {p.event.description && (
              <p className="text-muted-foreground whitespace-pre-line pt-2">{p.event.description}</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-medium">Votre réponse</h2>
            {answered && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <PartyPopper className="h-4 w-4 text-primary" />
                {p.status === "accepted"
                  ? "Votre participation est confirmée."
                  : p.status === "declined"
                    ? "Vous avez indiqué ne pas pouvoir venir."
                    : "Vous avez répondu « peut-être »."}
              </p>
            )}
            {canAnswer ? (
              <div className="grid gap-2">
                <Button className="rounded-full h-12" disabled={busy} onClick={() => answer("accepted")}>
                  <Check className="h-4 w-4 mr-2" /> Je participe
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full h-12"
                  disabled={busy}
                  onClick={() => answer("declined")}
                >
                  <X className="h-4 w-4 mr-2" /> Je ne peux pas venir
                </Button>
                {p.config.allowMaybe && (
                  <Button
                    variant="ghost"
                    className="rounded-full h-12"
                    disabled={busy}
                    onClick={() => answer("maybe")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" /> Je ne sais pas encore
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le délai de réponse est terminé. Contactez l'organisateur pour toute modification.
              </p>
            )}
          </CardContent>
        </Card>

        {p.status === "accepted" && token && (
          <GuestBringsBlock eventId={eventId} invitationId={invitationId} token={token} accepted />
        )}

        {p.status === "accepted" && p.config.contributionsEnabled && (

          <Card className="rounded-3xl border-border/60">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-medium">Que souhaitez-vous apporter ?</h2>
              <div className="flex gap-2">
                <Input
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  placeholder="Une tarte, du vin, des jeux…"
                  className="rounded-2xl h-11"
                />
                <Button className="rounded-full h-11" disabled={busy} onClick={submitContribution}>
                  Valider
                </Button>
              </div>
              {p.contribution && (
                <p className="text-xs text-muted-foreground">Actuellement noté : {p.contribution}</p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Aucun compte n'est nécessaire pour répondre à cette invitation.
        </p>
      </div>
    </main>
  );
}
