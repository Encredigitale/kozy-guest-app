import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kosy — Organisez vos moments et gardez-en le souvenir" },
      {
        name: "description",
        content:
          "Kosy aide à organiser les moments entre proches : qui vient, qui apporte quoi, et comment mieux préparer la prochaine fois.",
      },
      { property: "og:title", content: "Kosy" },
      {
        property: "og:description",
        content: "Organisez vos moments et gardez-en le souvenir.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center">
          <h1 className="font-serif text-6xl md:text-7xl text-primary mb-6">Kosy</h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-4 font-serif">
            Organisez vos moments et gardez-en le souvenir.
          </p>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Qui vient, qui apporte quoi, ce que vous avez partagé. Préparez la prochaine
            fois avec ce que vous avez aimé la dernière.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Créer un compte</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
