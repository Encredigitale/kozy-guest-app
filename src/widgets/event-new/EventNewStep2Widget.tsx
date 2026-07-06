import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, GUEST_CIRCLES, type EventTypeValue } from "@/lib/event-types";
import { StepShell, Field } from "./shell";
import { useEventNewWizard } from "./context";

export function EventNewStep2Widget() {
  const { data, update } = useEventNewWizard();
  return (
    <StepShell
      title="Personnalisez votre événement."
      subtitle="Quelques informations supplémentaires permettront de mieux préparer ce moment et d'aider vos invités."
    >
      <Field label="Type d'événement">
        <Select value={data.type} onValueChange={(v) => update({ type: v as EventTypeValue })}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Cercle invité">
        <div className="flex flex-wrap gap-2">
          {GUEST_CIRCLES.map((c) => {
            const active = data.circle === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => update({ circle: active ? "" : c })}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-all",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Menu ou thème">
        <Input
          value={data.menu}
          onChange={(e) => update({ menu: e.target.value })}
          placeholder="Ex. Barbecue, cuisine italienne, années 80…"
          className="h-11 rounded-2xl"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Ajoutez quelques informations utiles pour vos invités…"
          rows={4}
          className="rounded-2xl"
        />
      </Field>
    </StepShell>
  );
}
