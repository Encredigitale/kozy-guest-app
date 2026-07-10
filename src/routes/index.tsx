import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bienvenue" },
      { name: "description", content: "Créez un compte ou connectez-vous à votre espace." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-4xl tracking-tight text-primary">Bienvenue</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Accédez à votre espace personnel ou créez un compte pour commencer.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/login">Se connecter</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8">
            <Link to="/signup">Créer un compte</Link>
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground underline">
            Accès administrateur
          </Link>
        </p>
      </div>
    </div>
  );
}
