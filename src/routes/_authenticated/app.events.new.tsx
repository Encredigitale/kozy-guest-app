import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";
import { WizardContext, type WizardValue } from "@/widgets/event-new/context";
import { useSurfaceWidgets } from "@/core/registry/useRegistry";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Nouvel événement — Framework" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleWidget = (id: string) =>
    setSelectedWidgets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (): Promise<void> => {
    if (!title.trim()) { toast.error("Titre requis."); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        organizer_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Erreur.");
      return;
    }
    // Persist per-event widget overrides: activate only selected widgets.
    if (selectedWidgets.length > 0) {
      const rows = selectedWidgets.map((widget_id, i) => ({
        event_id: data.id,
        widget_id,
        enabled: true,
        position: i,
      }));
      await supabase.from("event_widgets" as never).insert(rows as never);
    }
    setSaving(false);
    toast.success("Événement créé.");
    navigate({ to: "/app/events/$eventId", params: { eventId: data.id } });
  };

  const value: WizardValue = useMemo(
    () => ({
      type, setType,
      title, setTitle,
      description, setDescription,
      startsAt, setStartsAt,
      location, setLocation,
      selectedWidgets, setSelectedWidgets, toggleWidget,
      step, next: () => setStep((s) => Math.min(s + 1, 2)), back: () => setStep((s) => Math.max(s - 1, 0)),
      submit, saving,
    }),
    [type, title, description, startsAt, location, selectedWidgets, step, saving],
  );

  const { data: placements } = useSurfaceWidgets("event.new");
  const current = placements[step];

  return (
    <WizardContext.Provider value={value}>
      <div className="p-8 max-w-3xl">
        <h1 className="font-serif text-3xl tracking-tight text-primary">Nouvel événement</h1>
        <div className="mt-2 flex items-center gap-1">
          {placements.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="mt-6">
          {current ? (
            <WidgetRenderer
              surface="event.new"
              layout="stack"
              // Render only the current step widget by filtering.
              // We use a placement filter via config below.
              context={{ __step: step }}
              fallback={<p className="text-sm text-muted-foreground">Aucune étape configurée.</p>}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune étape configurée. Utilisez le Studio pour publier les widgets de l'onboarding.</p>
          )}
        </div>
      </div>
    </WizardContext.Provider>
  );
}
