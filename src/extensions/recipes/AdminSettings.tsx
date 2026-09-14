import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { DEFAULT_RECIPES_CONFIG, type RecipesConfig } from "./config";
import { useRecipesConfig, useSaveRecipesConfig } from "./useRecipes";

const TOGGLES: Array<{ key: keyof RecipesConfig; label: string; hint: string }> = [
  { key: "enabled", label: "Fonctionnalité active", hint: "Désactive la recette partout." },
  { key: "allowText", label: "Recette écrite", hint: "Texte libre." },
  { key: "allowPhotos", label: "Photos", hint: "Photo d'une recette." },
  { key: "allowLink", label: "Lien web", hint: "Adresse d'une page." },
  { key: "allowSharing", label: "Partage avec les invités", hint: "Lecture seule." },
  { key: "searchEnabled", label: "Recherche globale", hint: "Titre, texte et note du lien." },
];

export default function RecipesAdminSettings() {
  const { data } = useRecipesConfig();
  const save = useSaveRecipesConfig();
  const [config, setConfig] = useState<RecipesConfig>(DEFAULT_RECIPES_CONFIG);

  useEffect(() => {
    if (data) setConfig(data);
  }, [data]);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Recette</CardTitle>
        <CardDescription>Réglages minimaux de la recette liée au menu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm">{t.label}</Label>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <Switch
              checked={Boolean(config[t.key])}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, [t.key]: v }))}
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <Label htmlFor="recipes-max-photos" className="text-sm">
            Nombre de photos autorisées (max. 2)
          </Label>
          <Input
            id="recipes-max-photos"
            type="number"
            min={1}
            max={2}
            value={config.maxPhotos}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                maxPhotos: Math.min(2, Math.max(1, Number(e.target.value) || 1)),
              }))
            }
          />
        </div>

        <Button
          className="rounded-full"
          disabled={save.isPending}
          onClick={() =>
            save.mutate(config, {
              onSuccess: () => toast.success("Réglages enregistrés."),
              onError: () => toast.error("Enregistrement impossible."),
            })
          }
        >
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
