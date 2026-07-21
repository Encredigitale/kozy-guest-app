import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SettingField } from "@/core/extensions";
import { Loader2 } from "lucide-react";

export function SettingsForm({
  schema,
  initialValues,
  onSubmit,
  submitting,
}: {
  schema: SettingField[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  submitting?: boolean;
}) {
  const defaults = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of schema) if (f.default !== undefined && f.default !== null) out[f.key] = f.default;
    return out;
  }, [schema]);

  const [values, setValues] = useState<Record<string, unknown>>({ ...defaults, ...initialValues });
  useEffect(() => setValues({ ...defaults, ...initialValues }), [defaults, initialValues]);

  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      {schema.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Cette extension n'expose aucun paramètre.</p>
      )}
      {schema.map((f) => {
        const v = values[f.key];
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
            {f.type === "text" && (
              <Input id={`f-${f.key}`} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            )}
            {f.type === "textarea" && (
              <Textarea id={`f-${f.key}`} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            )}
            {f.type === "number" && (
              <Input
                id={`f-${f.key}`}
                type="number"
                value={(v as number | string) ?? ""}
                onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              />
            )}
            {f.type === "boolean" && (
              <div className="flex items-center gap-2">
                <Switch id={`f-${f.key}`} checked={Boolean(v)} onCheckedChange={(c) => set(f.key, c)} />
                <span className="text-xs text-muted-foreground">{v ? "Activé" : "Désactivé"}</span>
              </div>
            )}
            {f.type === "select" && (
              <Select value={String(v ?? "")} onValueChange={(val) => set(f.key, val)}>
                <SelectTrigger id={`f-${f.key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
          </div>
        );
      })}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting} className="rounded-full">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enregistrer
        </Button>
      </div>
    </form>
  );
}
