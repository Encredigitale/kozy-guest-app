import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, HandHeart, Loader2, Minus, Plus } from "lucide-react";
import {
  cancelCommitment,
  commitToNeed,
  getPublicContributions,
} from "@/lib/contributions.functions";
import type { ContributionsContext, PublicNeed } from "./public-types";
import { formatQuantity, PRIORITY_LABELS } from "./config";
import { NeedIcon } from "./icons";

type Props = {
  eventId: string;
  invitationId: string;
  token: string;
  accepted: boolean;
};

const ERRORS: Record<string, string> = {
  taken: "Ce besoin vient d'être pris en charge par quelqu'un d'autre.",
  closed: "L'organisateur ne souhaite plus recevoir d'engagement sur ce besoin.",
  not_accepted: "Confirmez d'abord votre participation.",
  single_only: "Un seul engagement est autorisé pour cet événement.",
  edit_disabled: "Les engagements ne peuvent plus être modifiés.",
};

export default function ContributionsBlock({ eventId, invitationId, token, accepted }: Props) {
  const load = useServerFn(getPublicContributions);
  const commit = useServerFn(commitToNeed);
  const drop = useServerFn(cancelCommitment);

  const [ctx, setCtx] = useState<ContributionsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openNeed, setOpenNeed] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    if (!accepted) return;
    let cancelled = false;
    setLoading(true);
    load({ data: { eventId, invitationId, token } })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setCtx(r.context);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [accepted, eventId, invitationId, token, load]);

  if (!accepted) return null;
  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des contributions…
      </p>
    );
  }
  if (!ctx?.enabled || ctx.needs.length === 0) return null;

  const { config, needs } = ctx;
  const mine = needs.filter((n) => n.myCommitment);
  const open = needs.filter((n) => n.state === "available" || n.state === "partial");

  const startCommit = (need: PublicNeed) => {
    setOpenNeed(need.id);
    const suggested = need.myCommitment?.quantity ?? (need.needType === "unique" ? 1 : Math.min(1, need.remaining || 1));
    setAmount(suggested > 0 ? suggested : 1);
  };

  const maxFor = (need: PublicNeed) =>
    need.allowOvercommitment ? 1000000 : Math.max(need.remaining + (need.myCommitment?.quantity ?? 0), 1);

  const confirm = async (need: PublicNeed) => {
    setBusy(true);
    try {
      const quantity = need.needType === "unique" ? 1 : amount;
      const result = await commit({
        data: {
          eventId,
          invitationId,
          token,
          needId: need.id,
          commitmentId: need.myCommitment?.id,
          quantity,
        },
      });
      if (result.ok) {
        setCtx(result.context);
        setOpenNeed(null);
        toast.success(`C'est noté ! Vous vous êtes engagé pour ${formatQuantity(quantity, need.unitLabel, need.unitKind)}.`);
      } else {
        if (result.context) setCtx(result.context);
        setOpenNeed(null);
        toast.error(ERRORS[result.error] ?? "Engagement impossible.");
      }
    } catch {
      toast.error("Engagement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (commitmentId: string) => {
    setBusy(true);
    try {
      const result = await drop({ data: { eventId, invitationId, token, commitmentId } });
      if (result.ok) {
        setCtx(result.context);
        toast.success("Votre engagement est annulé.");
      } else toast.error(ERRORS[result.error] ?? "Annulation impossible.");
    } finally {
      setBusy(false);
    }
  };

  const renderNeed = (need: PublicNeed) => {
    const isOpenForm = openNeed === need.id;
    const money = need.unitKind === "money";
    return (
      <div key={need.id} className="rounded-2xl border border-border/60 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
              <NeedIcon name={need.icon} className="h-4 w-4 text-foreground/70" />
            </div>
            <div>
              <p className="text-sm font-medium">{need.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatQuantity(need.committed, need.unitLabel, need.unitKind)} sur{" "}
                {formatQuantity(need.target, need.unitLabel, need.unitKind)}
                {need.remaining > 0 && (
                  <> — il en manque {formatQuantity(need.remaining, need.unitLabel, need.unitKind)}</>
                )}
              </p>
              {need.description && <p className="pt-1 text-xs text-muted-foreground">{need.description}</p>}
            </div>
          </div>
          {need.priority !== "normal" && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {PRIORITY_LABELS[need.priority]}
            </Badge>
          )}
        </div>

        <Progress value={need.percent} className="h-1.5" />

        {config.participantVisibility === "transparent" && need.participants.length > 0 && (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {need.participants.map((p, i) => (
              <li key={`${need.id}-${i}`}>
                {p.name} : {formatQuantity(p.quantity, need.unitLabel, need.unitKind)}
              </li>
            ))}
          </ul>
        )}

        {need.myCommitment ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3 w-3" />
              Vous : {formatQuantity(need.myCommitment.quantity, need.unitLabel, need.unitKind)}
            </span>
            {config.allowGuestEdit && !isOpenForm && (
              <>
                <Button size="sm" variant="ghost" className="rounded-full text-xs" onClick={() => startCommit(need)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs text-muted-foreground"
                  disabled={busy}
                  onClick={() => cancel(need.myCommitment!.id)}
                >
                  Je ne peux finalement plus m'en occuper
                </Button>
              </>
            )}
          </div>
        ) : (
          need.state !== "covered" &&
          !isOpenForm && (
            <Button size="sm" className="rounded-full" onClick={() => startCommit(need)}>
              {config.ctaLabel}
            </Button>
          )
        )}

        {isOpenForm && (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
            {need.needType === "unique" ? (
              <p className="text-xs text-muted-foreground">Vous vous en occupez entièrement.</p>
            ) : money ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ma participation</p>
                <Input
                  type="number"
                  min={1}
                  className="h-10 rounded-2xl"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {need.needType === "people" ? "Combien de personnes ?" : "À combien souhaitez-vous contribuer ?"}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setAmount((a) => Math.max(a - 1, 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{amount}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setAmount((a) => Math.min(a + 1, maxFor(need)))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" disabled={busy} onClick={() => confirm(need)}>
                {money ? "Confirmer mon engagement" : "Confirmer"}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpenNeed(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-medium">
            <HandHeart className="h-4 w-4 text-primary" /> Un petit coup de main ?
          </h2>
          <p className="text-sm text-muted-foreground">
            Voici ce qu'il reste à prévoir pour l'événement. Choisissez librement ce à quoi vous souhaitez contribuer.
          </p>
        </div>

        <div className="space-y-3">{open.map(renderNeed)}</div>

        {mine.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium">Mes engagements</h3>
            <div className="space-y-3">{mine.filter((n) => !open.includes(n)).map(renderNeed)}</div>
            {mine.every((n) => open.includes(n)) && (
              <p className="text-xs text-muted-foreground">
                Vos engagements apparaissent ci-dessus avec la mention « Vous ».
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
