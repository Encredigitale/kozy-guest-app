import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardContext, type WizardValue } from "@/widgets/event-new/context";
import { useSurfaceWidgets } from "@/core/registry/useRegistry";
import { resolveWidgetComponent } from "@/core/registry/components";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Nouvel événement — Framework" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [menuChoices, setMenuChoices] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const addMenuChoice = (componentKey: string, label: string) =>
    setMenuChoices((prev) => ({ ...prev, [componentKey]: [...(prev[componentKey] ?? []), label] }));
  const removeMenuChoice = (componentKey: string, index: number) =>
    setMenuChoices((prev) => ({
      ...prev,
      [componentKey]: (prev[componentKey] ?? []).filter((_, i) => i !== index),
    }));

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
        metadata: {
          event_type: type || null,
          event_type_label: type === "other" ? customType.trim() || "Autre" : null,
        },
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
    // Persist menu choices captured during the wizard.
    const menuRows = Object.entries(menuChoices).flatMap(([componentKey, labels]) =>
      labels.map((label, i) => ({
        owner_id: user.id,
        widget_key: "event.menu",
        scope_type: "event",
        scope_id: data.id,
        payload: { component_key: componentKey, label },
        position: i,
      })),
    );
    if (menuRows.length > 0) {
      await supabase.from("widget_items").insert(menuRows as never);
    }
    setSaving(false);
    toast.success("Événement créé.");
    navigate({ to: "/app/events/$eventId", params: { eventId: data.id } });
  };

  const { data: placements } = useSurfaceWidgets("event.new");
  const steps = useMemo(
    () =>
      placements.filter(
        (p) =>
          p.widget.manifest.component !== "event.new.menu" || selectedWidgets.includes("event.menu"),
      ),
    [placements, selectedWidgets],
  );
  const stepCount = steps.length;

  const value: WizardValue = useMemo(
    () => ({
      type, setType,
      customType, setCustomType,
      title, setTitle,
      description, setDescription,
      startsAt, setStartsAt,
      location, setLocation,
      selectedWidgets, setSelectedWidgets, toggleWidget,
      menuChoices, addMenuChoice, removeMenuChoice,
      step,
      stepIndex: step,
      stepCount,
      isLastStep: step >= stepCount - 1,
      next: () => setStep((s) => Math.min(s + 1, Math.max(stepCount - 1, 0))),
      back: () => setStep((s) => Math.max(s - 1, 0)),
      submit, saving,
    }),
    [type, customType, title, description, startsAt, location, selectedWidgets, menuChoices, step, stepCount, saving],
  );

  const current = steps[Math.min(step, Math.max(stepCount - 1, 0))];

  return (
    <WizardContext.Provider value={value}>
      <div className="p-8 max-w-3xl">
        <h1 className="font-serif text-3xl tracking-tight text-primary">Nouvel événement</h1>
        <div className="mt-2 flex items-center gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="mt-6">
          {current ? (
            <StepRenderer componentKey={current.widget.manifest.component} />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune étape configurée. Utilisez le Studio pour publier les widgets de l'onboarding.</p>
          )}
        </div>
      </div>
    </WizardContext.Provider>
  );
}

function StepRenderer({ componentKey }: { componentKey: string }) {
  const Cmp = resolveWidgetComponent(componentKey);
  if (!Cmp) return <p className="text-sm text-destructive">Composant introuvable : {componentKey}</p>;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
      <Cmp />
    </Suspense>
  );
}
