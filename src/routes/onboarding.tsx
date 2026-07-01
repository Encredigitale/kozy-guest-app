import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import img1 from "@/assets/onboard-organize.jpg";
import img2 from "@/assets/onboard-share.jpg";
import img3 from "@/assets/onboard-remember.jpg";
import img4 from "@/assets/onboard-ready.jpg";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Découvrir Kosy" }] }),
  component: OnboardingPage,
});

const slides = [
  {
    img: img1,
    title: "Organisez simplement",
    text: "Créez vos événements en moins d'une minute.",
  },
  {
    img: img2,
    title: "Partagez",
    text: "Invitez vos proches et répartissez facilement les contributions.",
  },
  {
    img: img3,
    title: "Souvenez-vous",
    text: "Retrouvez vos repas, invités, photos et souvenirs à tout moment.",
  },
  {
    img: img4,
    title: "Tout est prêt",
    text: "Commencez dès aujourd'hui à créer des moments inoubliables.",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const s = slides[i];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between">
        {i > 0 ? (
          <button
            onClick={() => setI(i - 1)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link to="/" className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="text-sm text-muted-foreground hover:text-foreground px-2"
        >
          Passer
        </button>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-6 flex flex-col">
        <div key={i} className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-full max-w-sm mb-10">
            <img
              src={s.img}
              alt=""
              width={1200}
              height={1200}
              className="w-full h-auto rounded-[2rem]"
            />
          </div>
          <h2 className="font-serif text-3xl tracking-tight mb-3">{s.title}</h2>
          <p className="text-muted-foreground leading-relaxed max-w-xs">{s.text}</p>
        </div>

        <div className="flex justify-center gap-2 py-6">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Écran ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="pb-8 space-y-3">
          {last ? (
            <>
              <Button asChild size="lg" className="w-full rounded-full">
                <a href="/auth?mode=signup">Créer un compte</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-full">
                <Link to="/auth">Se connecter</Link>
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="w-full rounded-full"
              onClick={() => setI(i + 1)}
            >
              Continuer
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
