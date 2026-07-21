import { useMemo, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

type Menu = { starter: string; main: string; dessert: string };

export const MENUS_BY_TYPE: Record<string, Menu[]> = {
  wedding: [
    { starter: "Ceviche de daurade", main: "Filet mignon en croûte", dessert: "Pièce montée" },
    { starter: "Foie gras poêlé", main: "Suprême de volaille truffé", dessert: "Fraisier" },
  ],
  birthday: [
    { starter: "Tapas variées", main: "Paella royale", dessert: "Fondant chocolat" },
    { starter: "Bruschettas", main: "Burger maison", dessert: "Tiramisu" },
  ],
  dinner: [
    { starter: "Velouté de saison", main: "Risotto aux cèpes", dessert: "Panna cotta" },
  ],
  default: [
    { starter: "Salade composée", main: "Plat convivial", dessert: "Dessert du chef" },
  ],
};

export default function MenuSuggestionsWidget({ config }: WidgetProps) {
  const type = (config?.eventType as string) ?? "default";
  const [i, setI] = useState(0);
  const menus = useMemo(() => MENUS_BY_TYPE[type] ?? MENUS_BY_TYPE.default, [type]);
  const menu = menus[i % menus.length];

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Suggestion de menu</CardTitle>
            <CardDescription>Inspiration pour votre événement.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-xs uppercase text-muted-foreground">Entrée</dt><dd>{menu.starter}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Plat</dt><dd>{menu.main}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Dessert</dt><dd>{menu.dessert}</dd></div>
        </dl>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setI((n) => n + 1)}>
          Autre suggestion
        </Button>
      </CardContent>
    </Card>
  );
}
