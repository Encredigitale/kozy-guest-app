import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Mes moments — Kosy" }] }),
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<{ first_name: string | null } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Vous êtes bien déconnecté.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-primary">Kosy</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-serif text-3xl mb-2">
          Bonjour {profile?.first_name ?? ""} 👋
        </h2>
        <p className="text-muted-foreground mb-8">Vos prochains moments apparaîtront ici.</p>
        <Card>
          <CardHeader>
            <CardTitle>Aucun événement pour l'instant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier moment pour rassembler vos proches.
            </p>
            <Button disabled>Créer un événement (bientôt)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
