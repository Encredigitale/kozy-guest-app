import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { confirmEmailVerification } from "@/lib/email-verification.functions";

type State = "loading" | "verified" | "used" | "expired" | "invalid" | "error";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Validation de votre e-mail — Kozy" },
      { name: "description", content: "Confirmez votre adresse e-mail pour activer votre compte Kozy." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

const MESSAGES: Record<Exclude<State, "loading">, { title: string; text: string }> = {
  verified: { title: "Adresse confirmée", text: "Votre compte est désormais actif. Vous pouvez vous connecter." },
  used: { title: "Lien déjà utilisé", text: "Cette adresse a déjà été validée. Connectez-vous simplement." },
  expired: { title: "Lien expiré", text: "Ce lien de validation a expiré. Demandez-en un nouveau depuis la page de connexion." },
  invalid: { title: "Lien invalide", text: "Ce lien de validation n'est pas reconnu." },
  error: { title: "Une erreur est survenue", text: "Impossible de valider votre adresse pour le moment. Réessayez plus tard." },
};

function VerifyEmailPage() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setState("invalid");
    confirmEmailVerification({ data: { token } })
      .then((res) => setState(res.status))
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="kozy-auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-4xl text-accent">Kozy</Link>
        </div>
        <Card className="border-primary bg-popup text-popup-foreground shadow-[10px_10px_0_var(--color-accent)]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              {state === "loading" ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : state === "verified" ? (
                <CheckCircle2 className="h-10 w-10 text-primary" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <CardTitle>{state === "loading" ? "Validation en cours…" : MESSAGES[state].title}</CardTitle>
            <CardDescription>
              {state === "loading" ? "Merci de patienter quelques secondes." : MESSAGES[state].text}
            </CardDescription>
          </CardHeader>
          {state !== "loading" && (
            <CardContent>
              <Button asChild className="w-full rounded-full">
                <Link to="/login">Aller à la connexion</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
