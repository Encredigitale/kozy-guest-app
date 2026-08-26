import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import {
  useExtensions,
  useEventExtensions,
  useExtensionSettings,
  findExtensionByKey,
  extensionsQueryOptions,
} from "@/core/extensions";
import { checkExtensionCompatibility } from "@/core/version";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SettingsForm } from "@/core/extensions/SettingsForm";
import { toast } from "sonner";
import { Puzzle, Settings, AlertTriangle, Lock } from "lucide-react";
import { conflictingExtensionKeys, isExclusiveWinnerFrom } from "@/core/extensions/exclusivity";
import { useState } from "react";

/**
 * Per-event extension management. Shown inside the event detail page.
 * Only lists extensions whose scope is "event" or "both" AND that are
 * globally enabled.
 */
export function EventExtensionsPanel({ eventId }: { eventId: string }) {
  const { data: rows } = useExtensions();
  const { rows: eventRows, setEnabled } = useEventExtensions(eventId);
  const qc = useQueryClient();

  const scopedRows = (rows ?? []).filter((r) => {
    const scope = r.scope ?? "global";
    return r.enabled && (scope === "event" || scope === "both");
  });

  if (scopedRows.length === 0) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
              <Puzzle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Extensions</CardTitle>
              <CardDescription>Aucune extension activable au niveau événement.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const explicitMap: Record<string, boolean | undefined> = {};
  for (const r of eventRows) explicitMap[r.extension_key] = r.enabled;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Extensions</CardTitle>
            <CardDescription>Activez ou configurez les plugins pour cet événement.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {scopedRows.map((row) => {
          const def = findExtensionByKey(row.key);
          const eventRow = eventRows.find((r) => r.extension_key === row.key);
          // event scope defaults: enabled unless the event has an explicit disable row
          const baseEnabled = eventRow ? eventRow.enabled : true;
          // Exclusivité : une seule extension du groupe peut rester active.
          const exclusiveWith = conflictingExtensionKeys(row.key)
            .map((k) => (rows ?? []).find((r) => r.key === k))
            .filter((r): r is NonNullable<typeof r> => !!r);
          const enabledForEvent = baseEnabled && isExclusiveWinnerFrom(explicitMap, row.key);
          const compat = checkExtensionCompatibility(row);
          return (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border/40"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{row.name}</span>
                  <Badge variant="outline" className="text-[10px]">v{row.version}</Badge>
                  {!compat.ok && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> Incompatible
                    </Badge>
                  )}
                </div>
                  {exclusiveWith.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Lock className="h-2.5 w-2.5" /> Exclusif
                    </Badge>
                  )}
                </div>
                {row.description && <p className="text-xs text-muted-foreground truncate">{row.description}</p>}
                {exclusiveWith.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ne peut pas être activé en même temps que {exclusiveWith.map((r) => r.name).join(", ")}.
                  </p>
                )}
                <div className="hidden">
              </div>
              {def && (def.settingsSchema?.length || def.settingsComponent) && (
                <EventExtensionSettingsDialog eventId={eventId} extensionKey={row.key} name={row.name} />
              )}
              <Switch
                checked={enabledForEvent}
                disabled={!def || !compat.ok}
                onCheckedChange={(checked) =>
                  setEnabled.mutate(
                    { extensionKey: row.key, enabled: checked },
                    {
                      onSuccess: () => {
                        qc.invalidateQueries({ queryKey: extensionsQueryOptions.queryKey });
                        toast.success(checked ? "Extension activée pour cet événement" : "Extension désactivée pour cet événement");
                      },
                      onError: (e: unknown) =>
                        toast.error(e instanceof Error ? e.message : "Erreur"),
                    },
                  )
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EventExtensionSettingsDialog({
  eventId,
  extensionKey,
  name,
}: {
  eventId: string;
  extensionKey: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const def = findExtensionByKey(extensionKey);
  const settings = useExtensionSettings(extensionKey, eventId);
  if (!def) return null;
  const schema = def.settingsSchema ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">{name} — Paramètres de l'événement</DialogTitle>
        </DialogHeader>
        {def.settingsComponent ? (
          <def.settingsComponent eventId={eventId} />
        ) : (
          <SettingsForm
            schema={schema}
            initialValues={settings.eventSettings}
            submitting={settings.save.isPending}
            onSubmit={(values) =>
              settings.save.mutate(
                { settings: values, scope: "event" },
                {
                  onSuccess: () => {
                    toast.success("Paramètres enregistrés pour cet événement");
                    setOpen(false);
                  },
                },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
