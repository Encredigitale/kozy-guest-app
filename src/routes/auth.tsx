import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — Kosy" },
      { name: "description", content: "Connectez-vous ou créez votre compte Kosy." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl tracking-tight text-primary">Kosy</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Organisez vos moments et gardez-en le souvenir.
          </p>
        </div>

        {mode === "forgot" ? (
          <ForgotPasswordForm onBack={() => setMode("signin")} />
        ) : (
          <Card className="rounded-3xl border-border/60 shadow-none">
            <CardHeader>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 rounded-full">
                  <TabsTrigger value="signin" className="rounded-full">Se connecter</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-full">Créer un compte</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-6">
                  <SignInForm onForgot={() => setMode("forgot")} onSwitchSignup={() => setMode("signup")} />
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <SignUpForm onSwitchSignin={() => setMode("signin")} />
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Adresse e-mail</Label>
        <Input id="signin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Mot de passe</Label>
        <Input id="signin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
      <button type="button" onClick={onForgot} className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
        Mot de passe oublié ?
      </button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      const digits = phoneTrimmed.replace(/[\s().-]/g, "");
      // E.164-compatible : optionnel +, 8 à 15 chiffres
      if (!/^\+?[0-9]{8,15}$/.test(digits)) {
        toast.error("Numéro de téléphone invalide. Ex. +33 6 12 34 56 78.");
        return;
      }
    }
    if (birthDate) {
      const d = new Date(birthDate);
      if (Number.isNaN(d.getTime())) {
        toast.error("Date de naissance invalide.");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) {
        toast.error("La date de naissance ne peut pas être dans le futur.");
        return;
      }
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 120);
      if (d < minDate) {
        toast.error("Date de naissance invalide.");
        return;
      }
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      if (age < 13) {
        toast.error("Vous devez avoir au moins 13 ans pour créer un compte.");
        return;
      }
    }
    if (!accepted) {
      toast.error("Vous devez accepter les CGU et la politique de confidentialité.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phoneTrimmed || null,
          birth_date: birthDate || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("registered")) {
        toast.error("Un compte existe déjà avec cette adresse e-mail.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Compte créé !");
    navigate({ to: "/app" });
  };


  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="first-name">Prénom</Label>
          <Input id="first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Nom</Label>
          <Input id="last-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Adresse e-mail</Label>
        <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="signup-phone">Téléphone</Label>
          <Input id="signup-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+33 6 12 34 56 78" pattern="^[+0-9\s().-]{8,20}$" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-birthdate">Date de naissance</Label>
          <Input id="signup-birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} min="1900-01-01" max={new Date().toISOString().split("T")[0]} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Mot de passe</Label>
        <Input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmation</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="cgu" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
        <Label htmlFor="cgu" className="text-xs text-muted-foreground leading-relaxed">
          J'accepte les CGU et la politique de confidentialité.
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}


function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("E-mail envoyé. Consultez votre boîte de réception.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Recevez un lien pour réinitialiser votre mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si un compte existe pour {email}, vous recevrez un lien de réinitialisation.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={onBack}>
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Adresse e-mail</Label>
              <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
            <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
              Retour
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
