import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <h1 className="font-serif text-3xl tracking-tight text-primary">Espace privé</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cet espace est réservé aux administrateurs.
        </p>
        <div className="mt-6">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
