import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Espace administrateur" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!!data);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté.");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Espace administrateur</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification des accès…
            </div>
          ) : isAdmin ? (
            <p className="text-sm text-muted-foreground">
              Vous êtes connecté avec un compte administrateur.
            </p>
          ) : (
            <p className="text-sm text-destructive">
              Ce compte n'a pas les droits administrateur.
            </p>
          )}
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
