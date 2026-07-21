import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";

/**
 * Placeholder contribution widget — demonstrates the extension pattern.
 * Enable via the registry, then evolve the schema (event_contributions table)
 * when needed. The route surface stays untouched.
 */
export default function EventContributionsWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
            <Utensils className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Contributions</CardTitle>
            <CardDescription>Qui apporte quoi — module à activer.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Ce widget est un point d'extension. Ajoutez la table{" "}
          <span className="font-mono">event_contributions</span> et développez le widget
          associé pour l'événement <span className="font-mono">{eventId}</span>.
        </p>
      </CardContent>
    </Card>
  );
}
