import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer un compte" },
      { name: "description", content: "Créez votre compte utilisateur." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/account" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé ! Vérifiez votre boîte e-mail si nécessaire.");
    navigate({ to: "/account" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl tracking-tight text-primary">
            <Link to="/">Bienvenue</Link>
          </h1>
        </div>
        <Card className="rounded-3xl border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>Rejoignez votre espace personnel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
              <div className="text-sm text-center pt-2">
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  J'ai déjà un compte
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
