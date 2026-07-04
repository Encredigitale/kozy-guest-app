import { getWidgetsFor } from "./registry";
import type { WidgetContext, WidgetSurface } from "./types";

interface WidgetRendererProps {
  surface: WidgetSurface;
  context?: WidgetContext;
  /** Classe appliquée au conteneur qui empile les widgets. */
  className?: string;
}

/**
 * Moteur de rendu déclaratif.
 *
 *   1. Lit le Registry
 *   2. Filtre par surface, activation, type d'événement
 *   3. Instancie chaque widget dans l'ordre défini
 *
 * Les écrans consommateurs ne connaissent aucun widget en dur.
 */
export function WidgetRenderer({
  surface,
  context = {},
  className = "space-y-6",
}: WidgetRendererProps) {
  const widgets = getWidgetsFor(surface, context);

  if (widgets.length === 0) return null;

  return (
    <div className={className}>
      {widgets.map((w) => {
        const Cmp = w.component;
        return <Cmp key={w.id} context={context} />;
      })}
    </div>
  );
}
