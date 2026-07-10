import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — Framework" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Adresse e-mail ou mot de passe incorrect.");
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: "/app" });
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("E-mail envoyé si un compte existe.");
    setForgot(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-3xl tracking-tight text-primary">Framework</Link>
        </div>
        <Card className="rounded-3xl border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>{forgot ? "Mot de passe oublié" : "Se connecter"}</CardTitle>
            <CardDescription>
              {forgot ? "Recevez un lien de réinitialisation." : "Accédez à votre espace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={forgot ? onForgot : onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {!forgot && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading ? "Chargement..." : forgot ? "Envoyer le lien" : "Se connecter"}
              </Button>
              <div className="flex justify-between text-sm pt-2">
                <button type="button" onClick={() => setForgot((v) => !v)} className="text-muted-foreground hover:text-foreground">
                  {forgot ? "Retour" : "Mot de passe oublié"}
                </button>
                <Link to="/signup" className="text-muted-foreground hover:text-foreground">
                  Créer un compte
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
