import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/memories")({
  head: () => ({ meta: [{ title: "Souvenirs — Kosy" }] }),
  component: MemoriesPage,
});

function MemoriesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight mb-1">Souvenirs</h1>
        <p className="text-muted-foreground">Vos moments passés, rassemblés au même endroit.</p>
      </div>
      <Card className="rounded-3xl border-border/60 shadow-none">
        <CardContent className="py-16 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-accent grid place-items-center mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-serif text-xl mb-2">Bientôt disponible</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Retrouverez ici vos menus, invités, photos et notes de chaque moment passé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
