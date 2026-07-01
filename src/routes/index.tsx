import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Wine, Heart, Bell } from "lucide-react";
import heroImg from "@/assets/hero-gathering.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kosy — Organisez vos moments et gardez-en le souvenir" },
      {
        name: "description",
        content:
          "Kosy vous aide à organiser vos repas, anniversaires et moments entre proches, puis à en garder le souvenir.",
      },
      { property: "og:title", content: "Kosy" },
      {
        property: "og:description",
        content: "Organisez vos moments et gardez-en le souvenir.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/138174b4-e88f-4d60-9211-994d55091412/id-preview-4b03e345--1d2e76d7-37ad-4e92-b6af-e9cade9b7b8b.lovable.app-1781613459129.png",
      },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: Calendar,
    title: "Créez en quelques secondes",
    text: "Un événement, une date, un lieu — c'est tout.",
  },
  {
    icon: Users,
    title: "Invitez vos proches",
    text: "Famille, amis, collègues. Sans compte requis.",
  },
  {
    icon: Wine,
    title: "Répartissez les contributions",
    text: "Qui apporte le dessert ? Le vin ? Les fleurs ?",
  },
  {
    icon: Heart,
    title: "Gardez la mémoire",
    text: "Menus, invités, photos et souvenirs.",
  },
  {
    icon: Bell,
    title: "Ne rien oublier",
    text: "Rappels et checklists au bon moment.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="font-serif text-2xl tracking-tight text-primary">Kosy</div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-foreground">
                Les plus beaux souvenirs commencent autour d'une&nbsp;table.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Organisez facilement vos repas, anniversaires et moments entre proches.
                Invitez vos proches, répartissez les contributions et retrouvez l'historique
                de tous vos événements.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link to="/auth" search={{ mode: "signup" } as never}>Créer un compte</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                  <Link to="/auth">Se connecter</Link>
                </Button>
              </div>
              <div className="mt-4">
                <Link
                  to="/onboarding"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Découvrir l'application →
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-accent/40 rounded-[3rem] blur-3xl -z-10" />
              <img
                src={heroImg}
                alt="Famille et amis partageant un repas convivial autour d'une table."
                width={1600}
                height={1200}
                className="w-full h-auto rounded-[2rem] shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight">
              Tout ce qu'il faut, rien de plus.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pensé pour se concentrer sur l'essentiel : les gens.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Card
                key={b.title}
                className="p-6 rounded-3xl border-border/60 shadow-none hover:shadow-sm transition-shadow animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-11 w-11 rounded-2xl bg-accent grid place-items-center mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-serif text-lg mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight mb-4">
            Prêt à créer votre prochain moment ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Rejoignez Kosy et rassemblez ceux qui comptent.
          </p>
          <Button asChild size="lg" className="rounded-full px-10">
            <Link to="/auth">Commencer</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
          <div>© {new Date().getFullYear()} Kosy</div>
          <div className="font-serif text-primary">Kosy</div>
        </div>
      </footer>
    </div>
  );
}
