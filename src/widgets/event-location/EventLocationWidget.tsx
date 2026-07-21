import { useEffect, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";

export default function EventLocationWidget({ config }: WidgetProps) {
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, update, remove, upsertSingle } = useWidgetItems("event.location", scope);

  const item = items[0];
  const [single, setSingle] = useState<Record<string, unknown>>(item?.payload ?? {});
  useEffect(() => { if (item) setSingle(item.payload ?? {}); }, [item]);
  const setField = (k: string, v: unknown) => setSingle((s) => ({ ...s, [k]: v }));
  const save = () => upsertSingle.mutate(single, { onSuccess: () => toast.success("Enregistré.") });

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Localisation</CardTitle>
            <CardDescription>Adresse et accès.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <div className="space-y-1">
          <Label className="text-xs">Adresse</Label>
          <Input
            value={(single.address as string) ?? ""}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="12 rue…"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Accès / parking</Label>
          <Textarea
            value={(single.notes as string) ?? ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Digicode, parking…"
            className="min-h-24"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={upsertSingle.isPending} className="rounded-full">
            {upsertSingle.isPending ? "…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
