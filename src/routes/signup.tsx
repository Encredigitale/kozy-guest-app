import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/core/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { sendVerificationEmail } from "@/lib/email-verification.functions";


const schema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  displayName: z.string().trim().min(1, "Nom requis").max(80),
});

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer un compte — Ma Belle Table" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: { display_name: parsed.data.displayName },
      },
    });
    if (error) {
      setLoading(false);
      const raw = (error as { message?: string }).message?.trim();
      const message =
        !raw || raw === "{}"
          ? "Création du compte impossible pour le moment. Merci de réessayer dans quelques instants."
          : raw === "Error sending confirmation email"
            ? "Le service d'e-mail n'est pas disponible. Merci de réessayer plus tard."
            : raw;
      return toast.error(message);
    }
    // Le compte doit être validé par e-mail avant toute connexion.
    await supabase.auth.signOut();
    try {
      await sendVerificationEmail({ data: { email: parsed.data.email } });
    } catch {
      toast.error("Compte créé, mais l'envoi de l'e-mail de validation a échoué.");
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="kozy-auth-shell flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <BrandLogo size="lg" />
          </div>
          <Card className="border-primary bg-popup text-popup-foreground shadow-[10px_10px_0_var(--color-accent)]">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <MailCheck className="h-10 w-10 text-primary" />
              </div>
              <CardTitle>Vérifiez votre boîte e-mail</CardTitle>
              <CardDescription>
                Un lien de validation vient d'être envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte (lien valable 24 h).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full rounded-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await sendVerificationEmail({ data: { email } });
                    toast.success("E-mail renvoyé.");
                  } catch {
                    toast.error("Envoi impossible pour le moment.");
                  }
                  setLoading(false);
                }}
              >
                Renvoyer l'e-mail
              </Button>
              <Button asChild className="w-full rounded-full">
                <Link to="/login">Aller à la connexion</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  return (
    <div className="kozy-auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo size="lg" />
        </div>
        <Card className="border-primary bg-popup text-popup-foreground shadow-[10px_10px_0_var(--color-accent)]">
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>Rejoignez la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom affiché</Label>
                <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
              <div className="text-sm text-center pt-2">
                <Link to="/login" className="text-muted-foreground hover:text-foreground">J'ai déjà un compte</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
