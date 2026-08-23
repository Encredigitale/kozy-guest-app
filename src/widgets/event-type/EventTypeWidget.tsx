import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WidgetProps } from "@/core/registry/components";
import { useEvent, type EventRow } from "@/widgets/event-shared/queries";
import { useSession } from "@/core/auth/useSession";
import { useActiveEventTypes } from "@/core/eventTypes/useEventTypes";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby,
  Users, CalendarDays, Sparkles, Pencil, Check, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, LucideIcon> = {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby, Users, CalendarDays, Sparkles,
};

const OTHER_TYPE = "other";

export default function EventTypeWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: ev, isLoading } = useEvent(eventId);
  const { data: types = [] } = useActiveEventTypes();
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<string>("");
  const [draftCustom, setDraftCustom] = useState<string>("");

  const isOrganizer = ev && user && ev.organizer_id === user.id;

  const currentType = (ev?.metadata?.event_type as string) || null;
  const currentLabel = (ev?.metadata?.event_type_label as string) || null;

  const resolved = useMemo(() => {
    if (!currentType) return null;
    if (currentType === OTHER_TYPE) {
      const Icon = Sparkles;
      return { key: OTHER_TYPE, label: currentLabel || "Autre", Icon };
    }
    const found = types.find((t) => t.key === currentType);
    if (!found) return { key: currentType, label: currentType, Icon: Sparkles };
    const Icon = ICONS[found.icon] ?? Sparkles;
    return { key: found.key, label: found.label, Icon };
  }, [currentType, currentLabel, types]);

  const startEdit = () => {
    setDraftType(currentType || "");
    setDraftCustom(currentType === OTHER_TYPE ? currentLabel || "" : "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftType("");
    setDraftCustom("");
  };

  const save = async () => {
    if (!ev || !draftType) return;
    const metadata: EventRow["metadata"] = {
      ...ev.metadata,
      event_type: draftType,
      event_type_label: draftType === OTHER_TYPE ? draftCustom.trim() || "Autre" : null,
    };
    const { error } = await supabase.from("events").update({ metadata }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success("Type d'événement mis à jour.");
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    setEditing(false);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!ev) return null;

  const isOther = draftType === OTHER_TYPE;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <CardTitle className="text-base">Type d'événement</CardTitle>
        {isOrganizer && !editing && (
          <Button variant="ghost" size="icon" onClick={startEdit} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {types.map((t) => {
                const Icon = ICONS[t.icon] ?? Sparkles;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraftType(t.key)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${draftType === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <Icon className="h-5 w-5 text-primary mb-2" />
                    <p className="text-sm font-medium">{t.label}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDraftType(OTHER_TYPE)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${isOther ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <Sparkles className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium">Autre</p>
              </button>
            </div>
            {isOther && (
              <div className="space-y-2">
                <Label>Précisez le type</Label>
                <Input
                  value={draftCustom}
                  onChange={(e) => setDraftCustom(e.target.value)}
                  placeholder="Ex. Crémaillère, Brunch…"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit} className="rounded-full">
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button size="sm" onClick={save} disabled={!draftType || (isOther && !draftCustom.trim())} className="rounded-full">
                <Check className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
            </div>
          </div>
        ) : resolved ? (
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
              <resolved.Icon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium leading-tight">{resolved.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{resolved.key === OTHER_TYPE ? "Type personnalisé" : resolved.key}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Aucun type défini.
            {isOrganizer && (
              <Button variant="link" onClick={startEdit} className="p-0 h-auto text-sm">
                Choisir maintenant
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
