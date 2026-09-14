import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pencil, Share2, Trash2 } from "lucide-react";
import { urlLabel, type RecipesConfig } from "./config";
import { RecipePhotoViewer } from "./RecipePhotoViewer";
import { RecipeShareSheet } from "./RecipeShareSheet";
import { useRecipeMutations } from "./useRecipes";
import type { RecipeDetail } from "./public-types";

/** Rendu de la mise en forme légère : gras, listes, sauts de ligne. */
function renderText(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const isItem = /^\s*[-*]\s+/.test(line);
    const content = line.replace(/^\s*[-*]\s+/, "");
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{part}</span>
      ),
    );
    return (
      <p key={i} className={isItem ? "flex gap-2 text-sm" : "text-sm"}>
        {isItem && <span className="text-primary">•</span>}
        <span>{parts}</span>
      </p>
    );
  });
}

export function RecipeView({
  recipe,
  config,
  open,
  onOpenChange,
  onEdit,
}: {
  recipe: RecipeDetail;
  config: RecipesConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const { remove } = useRecipeMutations(recipe.eventId);
  const [viewer, setViewer] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>{recipe.title}</SheetTitle>
            <SheetDescription>Recette liée à cet élément du menu.</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {recipe.textContent && <div className="space-y-1.5">{renderText(recipe.textContent)}</div>}

            {recipe.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {recipe.photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="overflow-hidden rounded-xl border border-border/60"
                    onClick={() => setViewer(p.url)}
                  >
                    {p.url && <img src={p.url} alt="" className="h-32 w-full object-cover" />}
                  </button>
                ))}
              </div>
            )}

            {recipe.externalUrl && (
              <div className="space-y-1.5 rounded-xl border border-border/60 p-3">
                <a
                  href={recipe.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {urlLabel(recipe.externalUrl)}
                </a>
                {recipe.externalUrlNote && (
                  <p className="text-xs text-muted-foreground">{recipe.externalUrlNote}</p>
                )}
              </div>
            )}

            {recipe.canEdit && config.allowSharing && recipe.shares.length > 0 && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Partagée avec {recipe.shares.length} personne{recipe.shares.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {recipe.canEdit && (
            <div className="flex flex-wrap gap-2 pb-2">
              <Button variant="outline" className="rounded-full" onClick={onEdit}>
                <Pencil className="mr-1 h-4 w-4" />
                Modifier
              </Button>
              {config.allowSharing && (
                <Button variant="outline" className="rounded-full" onClick={() => setShareOpen(true)}>
                  <Share2 className="mr-1 h-4 w-4" />
                  {recipe.shares.length > 0
                    ? `Partagée avec ${recipe.shares.length}`
                    : "Partager"}
                </Button>
              )}
              <Button variant="ghost" className="rounded-full" onClick={() => setConfirm(true)}>
                <Trash2 className="mr-1 h-4 w-4 text-destructive" />
                Supprimer
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <RecipePhotoViewer url={viewer} open={!!viewer} onOpenChange={(v) => !v && setViewer(null)} />

      {recipe.canEdit && config.allowSharing && (
        <RecipeShareSheet recipe={recipe} open={shareOpen} onOpenChange={setShareOpen} />
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'élément du menu reste inchangé. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(recipe.id, {
                  onSuccess: () => {
                    toast.success("Recette supprimée.");
                    onOpenChange(false);
                  },
                  onError: () => toast.error("Suppression impossible."),
                })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
