import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveEventTypes } from "@/core/eventTypes/useEventTypes";
import { FeatureIcon } from "@/core/features/FeatureIcon";
import { AccordionSection, type SectionStatus } from "./AccordionSection";
import {
  emptyEventForm, formatDateSummary, fromStartsAt, isValidDate, missingOf,
  progressOf, requiredCriteria, toStartsAt, type EventFormValues,
} from "./state";

const DRAFT_KEY = "kozy.event.draft";

export type EventFormProps = {
  mode: "create" | "edit";
  eventId?: string;
  initial?: Partial<EventFormValues>;
  organizerId: string;
};

export function EventForm({ mode, eventId, initial, organizerId }: EventFormProps) {
  const navigate = useNavigate();
  const { data: types } = useActiveEventTypes();

  const initialValues = useMemo<EventFormValues>(
    () => ({ ...emptyEventForm, ...initial }),
    [initial],
  );
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [open, setOpen] = useState<number | null>(mode === "create" ? 0 : null);
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hydrated = useRef(false);

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  // Brouillon local (création uniquement)
  useEffect(() => {
    if (mode !== "create" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setValues((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch { /* ignore */ }
  }, [mode, values]);

  useEffect(() => { setValues(initialValues); }, [initialValues]);

  const criteria = requiredCriteria(values);
  const progress = progressOf(values);
  const missing = missingOf(values);
  const complete = progress === 100;
  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  );

  const sectionStatus = (index: number, optional = false): SectionStatus => {
    const items = criteria.filter((c) => c.section === index);
    if (!items.length) return optional ? "optional" : "todo";
    if (items.every((c) => c.valid)) return "done";
    if (touched[index]) return "error";
    return "todo";
  };

  const typeRow = types.find((t) => t.key === values.type);
  const typeSummary =
    values.type === "other"
      ? values.customType.trim() || null
      : typeRow?.label ?? null;

  const validateAndAdvance = (index: number, nextIndex: number | null) => {
    setTouched((t) => ({ ...t, [index]: true }));
    const ok = criteria.filter((c) => c.section === index).every((c) => c.valid);
    if (!ok) return;
    setOpen(nextIndex);
  };

  const toggle = (index: number) => setOpen((cur) => (cur === index ? null : index));

  const save = async () => {
    if (!complete) {
      const first = missing[0];
      if (first) setOpen(first.section);
      setTouched((t) => ({ ...t, ...Object.fromEntries(missing.map((m) => [m.section, true])) }));
      return;
    }
    setSaving(true);
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      starts_at: toStartsAt(values),
    };
    if (mode === "create") {
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...payload,
          organizer_id: organizerId,
          metadata: {
            event_type: values.type || null,
            event_type_label: values.type === "other" ? values.customType.trim() || "Autre" : null,
            organizer_note: values.organizerNote.trim() || null,
          },
        })
        .select("id")
        .single();
      setSaving(false);
      if (error || !data) { toast.error(error?.message ?? "Erreur."); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("Votre événement est créé 🎉");
      navigate({ to: "/app/events/$eventId", params: { eventId: data.id } });
      return;
    }
    const { data: current } = await supabase.from("events").select("metadata").eq("id", eventId!).maybeSingle();
    const meta = ((current?.metadata as Record<string, unknown>) ?? {});
    const { error } = await supabase
      .from("events")
      .update({
        ...payload,
        metadata: {
          ...meta,
          event_type: values.type || null,
          event_type_label: values.type === "other" ? values.customType.trim() || "Autre" : null,
          organizer_note: values.organizerNote.trim() || null,
        },
      })
      .eq("id", eventId!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Modifications enregistrées.");
    navigate({ to: "/app/events/$eventId", params: { eventId: eventId! } });
  };

  const remove = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId!);
    if (error) { toast.error(error.message); return; }
    toast.success("Événement supprimé.");
    navigate({ to: "/app/events" });
  };

  const backTo = mode === "edit" && eventId ? `/app/events/${eventId}` : "/app/events";

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 pb-28 sm:px-6">
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          to={backTo}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Retour
        </Link>
        <h1 className="font-serif text-2xl tracking-tight text-primary sm:text-3xl">
          {mode === "create" ? "Créer un événement" : "Modifier l'événement"}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">{progress} %</span>
        </div>
        {complete && (
          <p className="mt-1 text-xs text-primary">✓ Votre événement est prêt</p>
        )}
      </div>

      <div className="space-y-3 pt-2">
        {/* ① Type */}
        <AccordionSection
          index={0}
          title="Type d'événement"
          status={sectionStatus(0)}
          summary={typeSummary}
          isOpen={open === 0}
          onToggle={() => toggle(0)}
        >
          <p className="mb-3 text-sm text-muted-foreground">Quel événement organisez-vous ?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set("type", t.key)}
                className={`min-h-[72px] rounded-xl border-2 p-3 text-left transition-colors ${values.type === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <FeatureIcon id={t.key} name={t.icon} className="mb-1 h-5 w-5 text-primary" />
                <span className="block text-sm font-medium">{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => set("type", "other")}
              className={`min-h-[72px] rounded-xl border-2 p-3 text-left transition-colors ${values.type === "other" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Sparkles className="mb-1 h-5 w-5 text-primary" />
              <span className="block text-sm font-medium">Autre</span>
            </button>
          </div>
          {values.type === "other" && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="custom-type">Précisez le type</Label>
              <Input
                id="custom-type"
                className="h-11"
                value={values.customType}
                onChange={(e) => set("customType", e.target.value)}
                placeholder="Ex. Crémaillère, Brunch entre voisins…"
              />
            </div>
          )}
          {touched[0] && sectionStatus(0) !== "done" && (
            <p className="mt-2 text-sm text-destructive">Choisissez un type d'événement.</p>
          )}
          <Button className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => validateAndAdvance(0, 1)}>
            Continuer
          </Button>
        </AccordionSection>

        {/* ② Informations */}
        <AccordionSection
          index={1}
          title="Informations"
          status={sectionStatus(1)}
          summary={values.title.trim() || null}
          isOpen={open === 1}
          onToggle={() => toggle(1)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ev-title">Nom de l'événement *</Label>
              <Input
                id="ev-title"
                className="h-11"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Anniversaire de Julie"
              />
              {touched[1] && !values.title.trim() && (
                <p className="text-sm text-destructive">Donnez un nom à votre événement.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Quelques mots sur votre événement…"
              />
            </div>
          </div>
          <Button className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => validateAndAdvance(1, 2)}>
            Continuer
          </Button>
        </AccordionSection>

        {/* ③ Date & heure */}
        <AccordionSection
          index={2}
          title="Date & heure"
          status={sectionStatus(2)}
          summary={formatDateSummary(values)}
          isOpen={open === 2}
          onToggle={() => toggle(2)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ev-date">Date *</Label>
              <Input
                id="ev-date"
                type="date"
                className="h-11 w-full min-w-0"
                value={values.date}
                onChange={(e) => set("date", e.target.value)}
              />
              {touched[2] && !isValidDate(values.date) && (
                <p className="text-sm text-destructive">Choisissez une date valide.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-time">Heure *</Label>
              <Input
                id="ev-time"
                type="time"
                className="h-11 w-full min-w-0"
                value={values.time}
                onChange={(e) => set("time", e.target.value)}
              />
              {touched[2] && !/^\d{2}:\d{2}$/.test(values.time) && (
                <p className="text-sm text-destructive">Indiquez une heure.</p>
              )}
            </div>
          </div>
          <Button className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => validateAndAdvance(2, 3)}>
            Continuer
          </Button>
        </AccordionSection>

        {/* ④ Lieu */}
        <AccordionSection
          index={3}
          title="Lieu"
          status={sectionStatus(3)}
          summary={values.location.trim() ? `📍 ${values.location.trim()}` : null}
          isOpen={open === 3}
          onToggle={() => toggle(3)}
        >
          <div className="space-y-2">
            <Label htmlFor="ev-loc">Lieu *</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ev-loc"
                className="h-11 pl-9"
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="12 rue des Jardins, Metz"
              />
            </div>
            {touched[3] && !values.location.trim() && (
              <p className="text-sm text-destructive">Indiquez le lieu de l'événement.</p>
            )}
          </div>
          <Button className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => validateAndAdvance(3, 4)}>
            Continuer
          </Button>
        </AccordionSection>

        {/* ⑤ Compléments */}
        <AccordionSection
          index={4}
          title="Informations complémentaires"
          status={values.organizerNote.trim() ? "done" : "optional"}
          summary={values.organizerNote.trim() || null}
          isOpen={open === 4}
          onToggle={() => toggle(4)}
        >
          <div className="space-y-2">
            <Label htmlFor="ev-note">Note organisateur</Label>
            <Textarea
              id="ev-note"
              value={values.organizerNote}
              onChange={(e) => set("organizerNote", e.target.value)}
              placeholder="Dîner puis soirée…"
            />
            <p className="text-xs text-muted-foreground">Facultatif.</p>
          </div>
          <Button variant="secondary" className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => setOpen(null)}>
            Valider
          </Button>
        </AccordionSection>
      </div>

      <div className="mt-6 space-y-3">
        {!complete && missing.length > 0 && (
          <div className="rounded-xl bg-muted p-3 text-sm">
            <p className="font-medium">Encore {missing.length} information{missing.length > 1 ? "s" : ""} à compléter</p>
            <ul className="mt-1 space-y-1">
              {missing.map((m) => (
                <li key={m.key}>
                  <button
                    type="button"
                    className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setOpen(m.section)}
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button
          className="h-12 w-full rounded-full"
          disabled={saving || !complete || (mode === "edit" && !isDirty)}
          onClick={() => void save()}
        >
          {saving
            ? "Enregistrement…"
            : mode === "create"
              ? "Enregistrer l'événement"
              : "Enregistrer les modifications"}
        </Button>
        {mode === "edit" && (
          <Button
            variant="ghost"
            className="h-11 w-full rounded-full text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Supprimer l'événement
          </Button>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'événement et déclenchera le traitement des données associées
              selon les règles de chaque fonctionnalité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Supprimer l'événement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
