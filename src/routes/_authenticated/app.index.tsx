import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/core/auth/useSession";
import { supabase } from "@/integrations/supabase/client";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Framework" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useSession();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-primary">
          Bonjour {name} <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 capitalize">{today}</p>
      </header>

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
  );
}
