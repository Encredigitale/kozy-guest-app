import { useMemo, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, CircleDot, HandHeart, Plus, Trash2 } from "lucide-react";
import {
  COVERAGE_LABELS,
  NEED_PRIORITIES,
  NEED_TYPE_HINTS,
  NEED_TYPE_LABELS,
  PRIORITY_LABELS,
  computeCoverage,
  formatQuantity,
  type NeedPriority,
  type NeedType,
} from "./config";
import { NeedIcon } from "./icons";
import {
  useContributionCatalog,
  useContributionsConfig,
  useEventNeeds,
  type NeedRow,
} from "./useContributions";

type DraftNeed = {
  id?: string;
  categoryId: string | null;
  label: string;
  description: string;
  needType: NeedType;
  target: string;
  unitId: string | null;
  priority: NeedPriority;
  allowOvercommitment: boolean;
};

const emptyDraft = (allowOver: boolean): DraftNeed => ({
  categoryId: null,
  label: "",
  description: "",
  needType: "quantity",
  target: "1",
  unitId: null,
  priority: "normal",
  allowOvercommitment: allowOver,
});

export default function ContributionsWidget({ config }: WidgetProps) {
  const eventId = (config?.eventId as string) ?? "";
  const { data: catalog } = useContributionCatalog();
  const { data: settings } = useContributionsConfig();
  const { needs, commitments, isLoading, createNeed, updateNeed, deleteNeed } = useEventNeeds(eventId);
  const [draft, setDraft] = useState<DraftNeed | null>(null);

  const categories = (catalog?.categories ?? []).filter((c) => c.active);
  const units = (catalog?.units ?? []).filter((u) => u.active);
  const allowedTypes = settings?.needTypes ?? (["quantity", "unique", "people", "money"] as NeedType[]);

  const rows = useMemo(
    () =>
      needs.map((n) => {
        const mine = commitments.filter((c) => c.need_id === n.id);
        const committed = mine.reduce((sum, c) => sum + Number(c.quantity ?? 0), 0);
        const unit = units.find((u) => u.id === n.unit_id) ?? null;
        const category = categories.find((c) => c.id === n.category_id) ?? null;
        return {
          need: n,
          participants: mine,
          unit,
          category,
          ...computeCoverage({ target: Number(n.target_quantity ?? 0), committed, status: n.status }),
        };
      }),
    [needs, commitments, units, categories],
  );

  const summary = useMemo(() => {
    const covered = rows.filter((r) => r.state === "covered").length;
    const partial = rows.filter((r) => r.state === "partial").length;
    const available = rows.filter((r) => r.state === "available").length;
    const total = rows.length;
    return { covered, partial, available, total, percent: total ? Math.round((covered / total) * 100) : 0 };
  }, [rows]);

  const suggestions = (catalog?.suggestions ?? []).filter((s) => s.active).slice(0, 6);

  const openSuggestion = (label: string, categoryId: string | null, needType: NeedType, target: number | null, unitId: string | null) =>
    setDraft({
      categoryId,
      label,
      description: "",
      needType,
      target: String(target ?? 1),
      unitId,
      priority: "normal",
      allowOvercommitment: settings?.allowOvercommitmentDefault ?? false,
    });

  const submit = () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) return toast.error("Indiquez ce dont vous avez besoin.");
    const target = Number(draft.target);
    if (!Number.isFinite(target) || target <= 0) return toast.error("L'objectif doit être supérieur à 0.");
    const values: Partial<NeedRow> = {
      category_id: draft.categoryId,
      label,
      description: draft.description.trim() || null,
      need_type: draft.needType,
      target_quantity: draft.needType === "unique" ? 1 : target,
      unit_id: draft.unitId,
      priority: draft.priority,
      allow_overcommitment: draft.allowOvercommitment,
    };
    const done = {
      onSuccess: () => {
        setDraft(null);
        toast.success(draft.id ? "Besoin mis à jour." : "Besoin ajouté.");
      },
      onError: () => toast.error("Enregistrement impossible."),
    };
    if (draft.id) updateNeed.mutate({ id: draft.id, values }, done);
    else createNeed.mutate(values, done);
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
              <HandHeart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Contributions</CardTitle>
              <CardDescription>Ce qu'il nous manque pour cet événement.</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setDraft(emptyDraft(settings?.allowOvercommitmentDefault ?? false))}
          >
            <Plus className="mr-1 h-4 w-4" /> Ajouter un besoin
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {!isLoading && rows.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun besoin pour le moment. Ajoutez ce dont vous avez besoin, vos invités pourront s'en charger.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() =>
                      openSuggestion(s.label, s.category_id, s.need_type, s.target_quantity, s.unit_id)
                    }
                  >
                    + {s.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">
                {summary.total} besoin{summary.total > 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">✓ {summary.covered} couverts</span>
              <span className="text-muted-foreground">◐ {summary.partial} partiels</span>
              <span className="text-muted-foreground">○ {summary.available} disponibles</span>
            </div>
            <Progress value={summary.percent} className="h-2" />
            <p className="text-xs text-muted-foreground">{summary.percent} % des besoins couverts</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.need.id} className="rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                    <NeedIcon name={r.category?.icon} className="h-4 w-4 text-foreground/70" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.need.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Objectif : {formatQuantity(Number(r.need.target_quantity), r.unit?.label ?? null, r.unit?.kind ?? null)}
                    </p>
                    {r.need.description && (
                      <p className="pt-1 text-xs text-muted-foreground">{r.need.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={r.state === "covered" ? "default" : "secondary"} className="rounded-full">
                    {r.state === "covered" ? "Complet" : COVERAGE_LABELS[r.state]}
                  </Badge>
                  {(settings?.prioritiesEnabled ?? true) && r.need.priority !== "normal" && (
                    <span className="text-[10px] text-muted-foreground">{PRIORITY_LABELS[r.need.priority]}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Progress value={r.percent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {formatQuantity(r.committed, r.unit?.label ?? null, r.unit?.kind ?? null)} sur{" "}
                  {formatQuantity(Number(r.need.target_quantity), r.unit?.label ?? null, r.unit?.kind ?? null)}
                  {r.remaining > 0 && (
                    <> — il en manque {formatQuantity(r.remaining, r.unit?.label ?? null, r.unit?.kind ?? null)}</>
                  )}
                </p>
              </div>

              {r.participants.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {r.participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      <span>{p.guest_name ?? "Un invité"}</span>
                      <span className="text-muted-foreground">
                        {formatQuantity(Number(p.quantity), r.unit?.label ?? null, r.unit?.kind ?? null)}
                      </span>
                      {p.note && <span className="text-muted-foreground">· {p.note}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs"
                  onClick={() =>
                    setDraft({
                      id: r.need.id,
                      categoryId: r.need.category_id,
                      label: r.need.label,
                      description: r.need.description ?? "",
                      needType: r.need.need_type,
                      target: String(r.need.target_quantity),
                      unitId: r.need.unit_id,
                      priority: r.need.priority,
                      allowOvercommitment: r.need.allow_overcommitment,
                    })
                  }
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs"
                  onClick={() =>
                    updateNeed.mutate({
                      id: r.need.id,
                      values: { status: r.need.status === "open" ? "closed" : "open" },
                    })
                  }
                >
                  <CircleDot className="mr-1 h-3 w-3" />
                  {r.need.status === "open" ? "Fermer" : "Réouvrir"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs text-destructive"
                  onClick={() => deleteNeed.mutate(r.need.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Modifier le besoin" : "Ajouter un besoin"}</DialogTitle>
            <DialogDescription>Dites simplement ce qu'il vous manque.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Catégorie</Label>
                <Select
                  value={draft.categoryId ?? ""}
                  onValueChange={(v) => setDraft({ ...draft, categoryId: v || null })}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Besoin</Label>
                <Input
                  className="rounded-2xl"
                  placeholder="Bouteilles de vin rouge"
                  value={draft.label}
                  maxLength={120}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description (facultatif)</Label>
                <Textarea
                  rows={2}
                  className="rounded-2xl"
                  placeholder="Pour accompagner le plat principal."
                  value={draft.description}
                  maxLength={300}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type de besoin</Label>
                <Select
                  value={draft.needType}
                  onValueChange={(v) => setDraft({ ...draft, needType: v as NeedType })}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {NEED_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{NEED_TYPE_HINTS[draft.needType]}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Objectif</Label>
                  <Input
                    type="number"
                    min={1}
                    className="rounded-2xl"
                    value={draft.needType === "unique" ? 1 : draft.target}
                    disabled={draft.needType === "unique"}
                    onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unité</Label>
                  <Select
                    value={draft.unitId ?? ""}
                    onValueChange={(v) => setDraft({ ...draft, unitId: v || null })}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Sans unité" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(settings?.prioritiesEnabled ?? true) && (
                <div className="space-y-1">
                  <Label className="text-xs">Priorité</Label>
                  <Select
                    value={draft.priority}
                    onValueChange={(v) => setDraft({ ...draft, priority: v as NeedPriority })}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEED_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm">Autoriser le dépassement</p>
                  <p className="text-xs text-muted-foreground">Les invités peuvent aller au-delà de l'objectif.</p>
                </div>
                <Switch
                  checked={draft.allowOvercommitment}
                  onCheckedChange={(v) => setDraft({ ...draft, allowOvercommitment: v })}
                />
              </div>

              <Button className="w-full rounded-full" onClick={submit}>
                {draft.id ? "Enregistrer" : "Ajouter le besoin"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
