import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Heart,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import heroAsset from "@/assets/hero-gathering.jpg.asset.json";
import organizeImg from "@/assets/kozy-organize.jpg";
import shareImg from "@/assets/kozy-share.jpg";
import rememberImg from "@/assets/kozy-remember.jpg";
import readyImg from "@/assets/kozy-ready.jpg";

const heroImg = heroAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ma Belle Table — Organisez vos moments et gardez-en le souvenir" },
      {
        name: "description",
        content:
          "Ma Belle Table vous aide à organiser vos repas, anniversaires et moments entre proches, puis à en garder le souvenir.",
      },
      { property: "og:title", content: "Ma Belle Table" },
      {
        property: "og:description",
        content: "Organisez vos moments et gardez-en le souvenir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: CalendarDays,
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
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute left-[5%] top-36 hidden text-secondary lg:block">
          <Sparkles className="h-12 w-12 rotate-12" strokeWidth={2.5} />
        </div>
        <div className="pointer-events-none absolute right-[7%] top-24 text-accent">
          <Heart className="h-10 w-10 rotate-12" strokeWidth={2.5} />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
          <Link to="/" className="font-display text-3xl font-extrabold text-accent">
            Ma Belle Table.
          </Link>
          <Button asChild variant="outline" className="rounded-full border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">
            <Link to="/login">Se connecter</Link>
          </Button>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-28 lg:pt-12">
          <div className="relative max-w-2xl">
            <div className="mb-6 inline-flex rotate-[-2deg] items-center gap-2 rounded-full border-2 border-primary bg-secondary px-4 py-2 text-xs font-bold uppercase text-secondary-foreground">
              <Sparkles className="h-4 w-4" /> Les moments qui comptent
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.94] sm:text-7xl lg:text-8xl">
              L'art de
              <span className="block rotate-[-2deg] text-accent">se retrouver.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-primary-foreground/80 sm:text-xl">
              Organisez vos repas, anniversaires et moments entre proches. Invitez, partagez
              et gardez-en le souvenir.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full border-2 border-accent bg-accent px-8 text-accent-foreground shadow-[0_6px_0_var(--secondary)] hover:bg-accent/90 active:translate-y-1 active:shadow-none">
                <Link to="/signup">Créer un compte <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/50 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl pb-12 pt-6">
            <div className="absolute -right-2 top-0 z-20 rotate-6 rounded-lg border-2 border-primary bg-secondary px-4 py-2 font-display text-sm font-bold text-secondary-foreground sm:right-8">
              À partager sans modération !
            </div>
            <div className="relative rotate-2 overflow-hidden rounded-[2rem] border-4 border-accent bg-card shadow-[12px_14px_0_var(--secondary)]">
              <img
                src={heroImg}
                alt="Famille et amis partageant un repas convivial autour d'une table."
                width={1600}
                height={1200}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-background/95 p-4 text-foreground">
                <div>
                  <p className="font-display text-xl font-bold">Une table. Vos proches.</p>
                  <p className="text-sm text-muted-foreground">Et des souvenirs qui restent.</p>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-accent">
                  <Heart className="h-5 w-5" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 left-2 -rotate-3 rounded-xl border-2 border-primary bg-accent px-5 py-3 font-display font-bold text-accent-foreground sm:left-10">
              Tout le monde est invité.
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="mb-3 font-bold uppercase text-secondary">Simple, vraiment.</p>
              <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Tout ce qu'il faut,
                <span className="block text-primary/60">rien de plus.</span>
              </h2>
              <p className="mt-5 max-w-sm text-muted-foreground">
                Pensé pour se concentrer sur l'essentiel : les gens.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className={`group border-2 border-primary p-5 shadow-[5px_5px_0_var(--primary)] transition-transform hover:-translate-y-1 ${index === 0 ? "rotate-[-1deg] bg-accent" : index === 1 ? "rotate-1 bg-secondary text-secondary-foreground" : "bg-card"}`}
                >
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-primary text-accent">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{benefit.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${index === 1 ? "text-secondary-foreground/75" : "text-muted-foreground"}`}>
                    {benefit.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary py-16 text-primary-foreground lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="mb-4 font-bold uppercase text-accent">De l'idée au souvenir</p>
                <h2 className="max-w-4xl font-display text-4xl leading-tight sm:text-6xl">
                  Chaque moment mérite <span className="text-accent">sa petite histoire.</span>
                </h2>
              </div>
              <div className="hidden shrink-0 items-end gap-4 text-accent lg:flex">
                <p className="w-48 -rotate-6 text-right font-sans text-2xl italic leading-snug text-primary-foreground">Des gens, des échanges, des souvenirs.</p>
                <Camera className="h-16 w-16 rotate-6 text-secondary" strokeWidth={1.7} />
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {[
                { img: organizeImg, title: "Organisez", text: "Créez un événement en moins d'une minute." },
                { img: shareImg, title: "Partagez", text: "Invitez vos proches, répartissez les rôles." },
                { img: rememberImg, title: "Souvenez-vous", text: "Photos, menus et invités, tout est gardé." },
                { img: readyImg, title: "Recommencez", text: "Chaque événement inspire le prochain." },
              ].map((step, index) => (
                <article key={step.title} className="relative min-w-0">
                  <div className="absolute left-3 top-3 z-10 grid h-12 w-12 place-items-center rounded-full border-2 border-primary bg-accent font-display text-xl text-accent-foreground shadow-[2px_3px_0_var(--color-primary)]">
                    {index + 1}
                  </div>
                  <img src={step.img} alt={step.title} width={1024} height={1024} loading="lazy" className="aspect-square w-full rounded-2xl border-2 border-primary-foreground object-cover" />
                  <h3 className="mt-4 font-display text-2xl text-accent lg:text-3xl">{step.title}</h3>
                  <p className="mt-1 text-base leading-snug text-primary-foreground/85">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <Wine className="absolute left-6 top-16 hidden h-14 w-14 -rotate-12 text-secondary sm:block" />
          <UtensilsCrossed className="absolute right-8 top-20 hidden h-14 w-14 rotate-12 text-primary sm:block" />
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">Prêt à créer votre prochain moment ?</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Rejoignez Ma Belle Table et rassemblez ceux qui comptent.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full border-2 border-primary bg-primary px-10 text-primary-foreground shadow-[0_6px_0_var(--secondary)] hover:bg-primary/90 active:translate-y-1 active:shadow-none">
            <Link to="/signup">Commencer <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t-2 border-primary bg-accent text-accent-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm sm:px-8 lg:px-12">
          <div>© {new Date().getFullYear()} Ma Belle Table</div>
          <div className="font-display text-2xl font-extrabold">Ma Belle Table.</div>
        </div>
      </footer>
    </div>
  );
}
