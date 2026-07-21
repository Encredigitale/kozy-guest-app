import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Framework" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useSession();
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-serif text-3xl tracking-tight text-primary">Bonjour</h1>
      <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>

      <div className="mt-8">
        <WidgetRenderer
          surface="dashboard"
          fallback={
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Aucun widget publié pour le tableau de bord. Un administrateur peut les
                configurer dans le Studio.
              </CardContent>
            </Card>
          }
        />
      </div>
    </div>
  );
}
