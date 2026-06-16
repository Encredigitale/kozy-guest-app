import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  claimInviteContribution,
  getInviteEvent,
  proposeInviteContribution,
  submitInviteRsvp,
} from "@/lib/invite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Check, Loader2, MapPin, Plus } from "lucide-react";
import {
  CONTRIBUTION_CATEGORIES,
  contributionCategoryLabel,
  type ContributionCategory,
} from "@/lib/contribution-categories";
import { eventTypeLabel } from "@/lib/event-types";

export const Route = createFileRoute("/i/$token")({
  head: () => ({ meta: [{ title: "Invitation — Kosy" }] }),
  component: InvitePage,
});

type InviteData = Awaited<ReturnType<typeof getInviteEvent>>;

function InvitePage() {
  const { token } = Route.useParams();
  const fetchEvent = useServerFn(getInviteEvent);
  const rsvpFn = useServerFn(submitInviteRsvp);
  const claimFn = useServerFn(claimInviteContribution);
  const proposeFn = useServerFn(proposeInviteContribution);

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // RSVP form
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"yes" | "no" | "maybe">("yes");
  const [message, setMessage] = useState("");
  const [rsvpSent, setRsvpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Propose form
  const [propCategory, setPropCategory] = useState<ContributionCategory>("plat");
  const [propLabel, setPropLabel] = useState("");

  const reload = async () => {
    try {
      const r = await fetchEvent({ data: { token } });
      setData(r);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  const submitRsvp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) {
      toast.error("Indique ton prénom.");
      return;
    }
    setSubmitting(true);
    try {
      await rsvpFn({
        data: {
          token,
          name: name.trim(),
          status,
          message: message.trim() || undefined,
        },
      });
      setRsvpSent(true);
      toast.success("Réponse envoyée. Merci !");
    } catch {
      toast.error("Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const claim = async (id: string) => {
    if (!name.trim()) {
      toast.error("Indique d'abord ton prénom.");
      return;
    }
    try {
      await claimFn({ data: { token, contributionId: id, guestName: name.trim() } });
      toast.success("C'est noté, merci !");
      await reload();
    } catch {
      toast.error("Cet item vient d'être pris.");
      await reload();
    }
  };

  const propose = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) {
      toast.error("Indique d'abord ton prénom.");
      return;
    }
    if (!propLabel.trim()) return;
    try {
      await proposeFn({
        data: {
          token,
          category: propCategory,
          label: propLabel.trim(),
          guestName: name.trim(),
        },
      });
      setPropLabel("");
      toast.success("Proposition ajoutée.");
      await reload();
    } catch {
      toast.error("Ajout impossible.");
    }
  };

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
          <CardContent className="pt-6 space-y-2 text-sm">
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
            <CardTitle className="font-serif">Votre réponse</CardTitle>
          </CardHeader>
          <CardContent>
            {rsvpSent ? (
              <p className="text-sm text-muted-foreground">
                Merci {name}, votre réponse a bien été envoyée à l'organisateur·rice.
              </p>
            ) : (
              <form onSubmit={submitRsvp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Votre prénom</Label>
                  <Input
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    placeholder="Camille"
                    maxLength={60}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vous venez ?</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Oui, avec plaisir</SelectItem>
                      <SelectItem value="maybe">Peut-être</SelectItem>
                      <SelectItem value="no">Non, désolé·e</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Petit mot (optionnel)</Label>
                  <Textarea
                    value={message}
                    onChange={(ev) => setMessage(ev.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Envoyer ma réponse
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Que puis-je apporter ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Rien de demandé pour l'instant. Vous pouvez proposer quelque chose ci-dessous.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.contributions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {contributionCategoryLabel(c.category)}
                      </p>
                      <p className="text-sm truncate">{c.label}</p>
                    </div>
                    {c.claimed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5" /> Pris
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => claim(c.id)}>
                        Je l'apporte
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={propose} className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium">Proposer un item</p>
              <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
                <Select value={propCategory} onValueChange={(v) => setPropCategory(v as ContributionCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ex. Tarte au citron"
                  value={propLabel}
                  onChange={(ev) => setPropLabel(ev.target.value)}
                  maxLength={120}
                />
                <Button type="submit" variant="secondary">
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground py-4">
          Propulsé par Kosy
        </p>
      </div>
    </div>
  );
}
