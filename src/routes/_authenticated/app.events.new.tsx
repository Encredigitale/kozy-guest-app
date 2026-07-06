import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWidgetsFor } from "@/core/widgets";
import {
  EventNewWizardProvider,
  isStep1Valid,
  useEventNewWizard,
} from "@/widgets/event-new/context";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Créer un moment — Kosy" }] }),
  component: NewEventPage,
});

const STEP_ILLUSTRATIONS = ["🍽️", "🍷", "👥"];

function NewEventPage() {
  return (
    <EventNewWizardProvider>
      <WizardShell />
    </EventNewWizardProvider>
  );
}

function WizardShell() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { data } = useEventNewWizard();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // Fetch step widgets from the registry (ordered by `order`).
  const widgets = getWidgetsFor("event.new", { userId: user.id });
  const totalSteps = widgets.length;
  const currentWidget = widgets[step - 1];
  const CurrentComponent = currentWidget?.component;

  const progress = createdEventId ? 100 : (step / totalSteps) * 100;
  const canNextFromStep1 = isStep1Valid(data);

  const goNext = () => {
    if (step === 1 && !canNextFromStep1) {
      toast.error("Ajoutez au moins un nom et une date.");
      return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const createEvent = async () => {
    if (!data.date) return;
    setSaving(true);
    const [hh, mm] = data.time.split(":").map((n) => parseInt(n, 10));
    const eventAt = new Date(data.date);
    eventAt.setHours(hh || 0, mm || 0, 0, 0);

    const { data: created, error } = await supabase
      .from("events")
      .insert({
        owner_id: user.id,
        event_type: data.type,
        event_subtype: data.circle || null,
        title: data.title.trim(),
        event_at: eventAt.toISOString(),
        location: data.location.trim() || null,
        description: data.description.trim() || null,
        menu_or_theme: data.menu.trim() || null,
      })
      .select("id")
      .single();

    if (error || !created) {
      setSaving(false);
      toast.error("Impossible de créer le moment.");
      return;
    }
    if (data.guests.length > 0) {
      await supabase.from("event_guests").insert(
        data.guests.map((g) => ({
          event_id: created.id,
          name: g.name,
          email: g.email || null,
        })),
      );
    }
    setSaving(false);
    setCreatedEventId(created.id);
  };

  if (createdEventId) {
    return (
      <div className="max-w-xl mx-auto pt-4 pb-24">
        <ProgressHeader progress={100} step={totalSteps} total={totalSteps} success />
        <div className="mt-8 text-center animate-fade-in">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
            <div className="text-5xl animate-fade-in">🎉</div>
          </div>
          <h1 className="font-serif text-3xl mb-2">Votre événement est prêt !</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Vous pouvez maintenant inviter vos proches, organiser les contributions et préparer ce moment sereinement.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() =>
                navigate({ to: "/app/events/$eventId", params: { eventId: createdEventId } })
              }
            >
              <Mail className="h-4 w-4" /> Inviter maintenant
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate({ to: "/app" })}>
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4 pb-24">
      <ProgressHeader progress={progress} step={step} total={totalSteps} />

      <div key={step} className={cn("mt-8 animate-fade-in")}>
        {CurrentComponent ? <CurrentComponent context={{ userId: user.id }} /> : null}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={goBack} className="rounded-2xl" disabled={saving}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        )}
        <div className="flex-1" />
        {step < totalSteps ? (
          <Button
            size="lg"
            onClick={goNext}
            className="rounded-2xl min-w-32"
            disabled={step === 1 && !canNextFromStep1}
          >
            Suivant <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={createEvent} disabled={saving} className="rounded-2xl min-w-48">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Créer mon événement
          </Button>
        )}
      </div>

      {step === 1 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/app" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressHeader({
  progress,
  step,
  total,
  success = false,
}: {
  progress: number;
  step: number;
  total: number;
  success?: boolean;
}) {
  const illustration = success ? "🎉" : STEP_ILLUSTRATIONS[Math.min(step, STEP_ILLUSTRATIONS.length) - 1];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {success ? "Terminé" : `Étape ${step} / ${total}`}
        </span>
        <div
          key={illustration}
          className={cn("text-2xl transition-transform", success ? "animate-scale-in" : "animate-fade-in")}
        >
          {illustration}
        </div>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}
