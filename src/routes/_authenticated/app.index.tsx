import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/core/auth/useSession";
import { supabase } from "@/integrations/supabase/client";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Accueil — Kosy" },
      { name: "description", content: "Votre tableau de bord Kosy." },
      { property: "og:title", content: "Accueil — Kosy" },
      { property: "og:description", content: "Votre tableau de bord Kosy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-background to-background border border-border/60 p-6 md:p-8 mb-8">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <Sparkles className="h-3 w-3" />
              {today}
            </div>
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-primary">
              Bonjour{name ? ` ${name}` : ""} <span className="inline-block">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Retrouvez vos événements, invitations et actions du moment en un clin d'œil.
            </p>
          </div>
          <Button asChild className="rounded-full shrink-0">
            <Link to="/app/events/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Créer un moment
            </Link>
          </Button>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Mon tableau de bord</h2>
      </div>

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

