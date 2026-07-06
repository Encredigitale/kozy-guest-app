import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { StepShell, Field } from "./shell";
import { useEventNewWizard } from "./context";

export function EventNewStep1Widget() {
  const { data, update } = useEventNewWizard();
  return (
    <StepShell
      title="Parlez-nous de votre événement."
      subtitle="Commençons par les informations essentielles. Vous pourrez compléter les détails ensuite."
    >
      <Field label="Nom de l'événement">
        <Input
          autoFocus
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Ex. Dîner entre amis, Anniversaire de Julie…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-11 rounded-2xl",
                  !data.date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {data.date ? format(data.date, "d MMM yyyy", { locale: fr }) : <span>Choisir</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.date}
                onSelect={(d) => update({ date: d })}
                locale={fr}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Heure">
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={data.time}
              onChange={(e) => update({ time: e.target.value })}
              className="pl-9 h-11 rounded-2xl"
            />
          </div>
        </Field>
      </div>

      <Field label="Lieu">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={data.location}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="Adresse ou nom du lieu"
            className="pl-9 h-11 rounded-2xl"
          />
        </div>
      </Field>
    </StepShell>
  );
}
