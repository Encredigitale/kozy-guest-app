import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import { RecipeEditor } from "./RecipeEditor";
import { RecipeView } from "./RecipeView";
import { useRecipe, useRecipesConfig } from "./useRecipes";
import type { RecipeSummary } from "./public-types";

/**
 * Action discrète attachée à un élément du menu.
 * La recette n'est jamais une carte autonome : elle s'ouvre depuis son élément.
 */
export function RecipeMenuAction({
  eventId,
  menuItemId,
  menuItemLabel,
  summary,
  canEdit,
}: {
  eventId: string;
  menuItemId: string;
  menuItemLabel: string;
  summary: RecipeSummary | undefined;
  canEdit: boolean;
}) {
  const { data: config } = useRecipesConfig();
  const [viewOpen, setViewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { data: recipe } = useRecipe(summary && (viewOpen || editorOpen) ? summary.id : null);

  if (!config?.enabled) return null;
  if (!summary && !canEdit) return null;

  return (
    <>
      {summary ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2 text-[11px] text-primary"
          onClick={() => setViewOpen(true)}
        >
          <BookOpen className="mr-1 h-3.5 w-3.5" />
          Recette
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2 text-[11px] text-muted-foreground"
          onClick={() => setEditorOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Recette
        </Button>
      )}

      {recipe && (
        <RecipeView
          recipe={recipe}
          config={config}
          open={viewOpen}
          onOpenChange={setViewOpen}
          onEdit={() => {
            setViewOpen(false);
            setEditorOpen(true);
          }}
        />
      )}

      {canEdit && (
        <RecipeEditor
          eventId={eventId}
          menuItemId={menuItemId}
          menuItemLabel={menuItemLabel}
          recipe={summary ? (recipe ?? null) : null}
          config={config}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}
    </>
  );
}
