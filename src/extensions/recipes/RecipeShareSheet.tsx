import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRecipeShareCandidates, useRecipeMutations } from "./useRecipes";
import type { RecipeDetail } from "./public-types";

const STATUS_LABEL: Record<string, string> = {
  accepted: "Participe",
  maybe: "Peut-être",
  sent: "En attente",
  opened: "En attente",
  draft: "En attente",
  expired: "En attente",
};

/** Partage ciblé : les participants d'abord, les autres invités à la demande. */
export function RecipeShareSheet({
  recipe,
  open,
  onOpenChange,
}: {
  recipe: RecipeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: candidates = [], isLoading } = useRecipeShareCandidates(recipe.eventId, open);
  const { share } = useRecipeMutations(recipe.eventId);
  const [selected, setSelected] = useState<string[]>([]);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    if (open) setSelected(recipe.shares.map((s) => s.invitationId));
  }, [open, recipe.shares]);

  const accepted = useMemo(() => candidates.filter((c) => c.accepted), [candidates]);
  const others = useMemo(() => candidates.filter((c) => !c.accepted), [candidates]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    share.mutate(
      { recipeId: recipe.id, invitationIds: selected },
      {
        onSuccess: () => {
          toast.success(
            selected.length === 0
              ? "Partage retiré."
              : `Partagée avec ${selected.length} personne${selected.length > 1 ? "s" : ""}.`,
          );
          onOpenChange(false);
        },
        onError: () => toast.error("Partage impossible pour le moment."),
      },
    );
  };

  const row = (c: (typeof candidates)[number]) => (
    <label
      key={c.invitationId}
      className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5"
    >
      <Checkbox
        checked={selected.includes(c.invitationId)}
        onCheckedChange={() => toggle(c.invitationId)}
      />
      <span className="flex-1 text-sm">{c.name}</span>
      <Badge variant="outline" className="rounded-full text-[10px]">
        {STATUS_LABEL[c.status] ?? "En attente"}
      </Badge>
    </label>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Partager la recette</SheetTitle>
          <SheetDescription>
            Les personnes choisies pourront la consulter en lecture seule.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des invités…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun invité pour l'instant. Invitez d'abord des personnes à l'événement.
            </p>
          ) : (
            <>
              {accepted.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Participent</p>
                  {accepted.map(row)}
                </div>
              )}
              {others.length > 0 &&
                (showOthers ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Autres invités</p>
                    {others.map(row)}
                  </div>
                ) : (
                  <Button variant="ghost" className="rounded-full" onClick={() => setShowOthers(true)}>
                    Voir les autres invités ({others.length})
                  </Button>
                ))}
            </>
          )}
        </div>

        <div className="flex gap-2 pb-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1 rounded-full" onClick={submit} disabled={share.isPending}>
            Partager
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
