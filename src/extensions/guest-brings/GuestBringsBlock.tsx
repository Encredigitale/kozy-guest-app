import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteGuestContribution,
  getGuestBrings,
  saveGuestContribution,
} from "@/lib/guest-brings.functions";
import type { GuestBringsContext, ContributionTypePublic } from "./public-types";
import { ContributionIcon } from "./icons";
import { CONTRIBUTION_UNITS } from "./config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";

type Props = {
  eventId: string;
  invitationId: string;
  token: string;
  /** Le bloc n'est visible que si l'invité a accepté. */
  accepted: boolean;
};

type Draft = {
  contributionId?: string;
  typeId: string;
  choiceId: string | null;
  label: string;
  quantity: string;
  unit: string;
  note: string;
};

export default function GuestBringsBlock({ eventId, invitationId, token, accepted }: Props) {
  const load = useServerFn(getGuestBrings);
  const save = useServerFn(saveGuestContribution);
  const remove = useServerFn(deleteGuestContribution);

  const [ctx, setCtx] = useState<GuestBringsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load({ data: { eventId, invitationId, token } })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setCtx(r.context);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId, invitationId, token, load]);

  const category: ContributionTypePublic | null = useMemo(
    () => ctx?.categories.find((c) => c.id === draft?.typeId) ?? null,
    [ctx, draft],
  );

  if (!accepted || loading || !ctx?.enabled) {
    if (accepted && loading) {
      return (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      );
    }
    return null;
  }

  const { config, categories, contributions, othersByType, menuHints } = ctx;
  const canAdd = config.multiple || contributions.length === 0;

  const startDraft = (typeId: string) =>
    setDraft({ typeId, choiceId: null, label: "", quantity: "", unit: "", note: "" });

  const submit = async () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) return toast.error("Précisez ce que vous apportez.");
    setBusy(true);
    try {
      const result = await save({
        data: {
          eventId,
          invitationId,
          token,
          contributionId: draft.contributionId,
          typeId: draft.typeId,
          choiceId: draft.choiceId,
          label,
          quantity: draft.quantity ? Number(draft.quantity) : null,
          unit: draft.unit || null,
          note: draft.note.trim() || null,
        },
      });
      if (result.ok) {
        setCtx(result.context);
        setDraft(null);
        toast.success("C'est noté !");
      } else {
        toast.error(
          result.error === "single_only"
            ? "Un seul apport est autorisé pour cet événement."
            : "Enregistrement impossible.",
        );
      }
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const drop = async (contributionId: string) => {
    setBusy(true);
    try {
      const result = await remove({ data: { eventId, invitationId, token, contributionId } });
      if (result.ok) setCtx(result.context);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-medium">Vous souhaitez apporter quelque chose ?</h2>
          <p className="text-sm text-muted-foreground">
            Faites savoir à votre hôte ce que vous prévoyez d'apporter. Rien n'est obligatoire.
          </p>
        </div>

        {contributions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vous apportez</p>
            <ul className="space-y-2">
              {contributions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-2 text-sm"
                >
                  <ContributionIcon name={c.icon} className="h-4 w-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate">
                    {c.quantity ? `${c.quantity} ${c.unit ?? ""} ` : ""}
                    {c.label}
                    {c.note && <span className="text-muted-foreground"> — {c.note}</span>}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    disabled={busy}
                    onClick={() =>
                      setDraft({
                        contributionId: c.id,
                        typeId: c.typeId ?? categories[0]?.id ?? "",
                        choiceId: c.choiceId,
                        label: c.label,
                        quantity: c.quantity ? String(c.quantity) : "",
                        unit: c.unit ?? "",
                        note: c.note ?? "",
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-destructive"
                    disabled={busy}
                    onClick={() => drop(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!draft && canAdd && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => startDraft(c.id)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border/60 p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  <ContributionIcon name={c.icon} className="h-5 w-5 text-primary" />
                  <span className="leading-tight">{c.label}</span>
                  {config.showDuplicateHint && (othersByType[c.key] ?? 0) > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {othersByType[c.key]} personne{othersByType[c.key]! > 1 ? "s" : ""} déjà
                    </span>
                  )}
                </button>
              ))}
            </div>
            {menuHints.length > 0 && (
              <p className="text-xs text-muted-foreground">Au menu : {menuHints.join(", ")}</p>
            )}
          </div>
        )}

        {!draft && !canAdd && (
          <p className="text-xs text-muted-foreground">Un seul apport est autorisé pour cet événement.</p>
        )}

        {draft && (
          <div className="space-y-4 rounded-2xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ContributionIcon name={category?.icon} className="h-4 w-4 text-primary" />
              {category?.label ?? "Apport"}
            </div>

            {category && category.choices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {category.choices.map((ch) => (
                  <Badge
                    key={ch.id}
                    variant={draft.choiceId === ch.id ? "default" : "secondary"}
                    className="cursor-pointer rounded-full px-3 py-1"
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, choiceId: ch.id, label: d.label.trim() ? d.label : ch.label } : d,
                      )
                    }
                  >
                    {ch.label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Que prévoyez-vous d'apporter ?</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => (d ? { ...d, label: e.target.value } : d))}
                placeholder="Ex. bouquet de fleurs, jeu de société, cadeau pour l'enfant…"
                className="h-11 rounded-2xl"
                maxLength={160}
              />
            </div>

            {config.quantityEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Quantité</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.quantity}
                    onChange={(e) => setDraft((d) => (d ? { ...d, quantity: e.target.value } : d))}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unité</Label>
                  <select
                    value={draft.unit}
                    onChange={(e) => setDraft((d) => (d ? { ...d, unit: e.target.value } : d))}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                  >
                    {CONTRIBUTION_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {config.notesEnabled && (
              <div className="space-y-1">
                <Label className="text-xs">Ajouter une précision</Label>
                <Input
                  value={draft.note}
                  onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
                  placeholder="Ex. gâteau sans gluten"
                  className="h-11 rounded-2xl"
                  maxLength={300}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button className="h-11 flex-1 rounded-full" disabled={busy} onClick={submit}>
                <Check className="mr-2 h-4 w-4" /> Confirmer ce que j'apporte
              </Button>
              <Button variant="ghost" className="h-11 rounded-full" disabled={busy} onClick={() => setDraft(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
