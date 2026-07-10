import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Layers, ShieldCheck, Puzzle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Framework — Plateforme SaaS modulaire" },
      { name: "description", content: "Un Core stable, des widgets déclaratifs, des interfaces générées automatiquement." },
      { property: "og:title", content: "Framework — Plateforme SaaS modulaire" },
      { property: "og:description", content: "Un Core stable, des widgets déclaratifs, des interfaces générées automatiquement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-serif text-xl tracking-tight text-primary">Framework</span>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Se connecter</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/signup">Créer un compte</Link>
          </Button>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-5xl tracking-tight text-primary">
          Une plateforme, mille modules.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Le cœur reste stable. Les fonctionnalités s'ajoutent, se retirent, se composent —
          sans jamais toucher au moteur.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/signup">Commencer</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8">
            <Link to="/login">J'ai un compte</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Layers, title: "Core stable", body: "Utilisateur, sécurité, navigation, notifications. Le socle ne change pas." },
          { icon: Puzzle, title: "Widgets déclaratifs", body: "Chaque module se décrit par un manifest. L'UI se génère toute seule." },
          { icon: ShieldCheck, title: "Sécurité par défaut", body: "Rôles, permissions, journalisation d'audit intégrés au Core." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="p-6 rounded-2xl border border-border/60">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
