import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { ReferentialItem, UserSelection } from "./types";

export function SelectionEditor({
  items,
  selected,
  saving,
  onSave,
  onCancel,
}: {
  items: ReferentialItem[];
  selected: UserSelection[];
  saving: boolean;
  onSave: (values: { refId: string; custom_value?: string | null }[]) => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState<Record<string, string>>({});

  useEffect(() => {
    setChecked(new Set(selected.map((s) => s.refId).filter((v): v is string => !!v)));
    const map: Record<string, string> = {};
    selected.forEach((s) => {
      if (s.refId && s.custom_value) map[s.refId] = s.custom_value;
    });
    setCustom(map);
  }, [selected]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`ref-${item.id}`}
                checked={checked.has(item.id)}
                onCheckedChange={() => toggle(item.id)}
              />
              <Label htmlFor={`ref-${item.id}`} className="font-normal cursor-pointer">
                {item.label}
              </Label>
            </div>
            {item.allows_custom && checked.has(item.id) && (
              <Input
                value={custom[item.id] ?? ""}
                onChange={(e) => setCustom((p) => ({ ...p, [item.id]: e.target.value }))}
                placeholder="Précisez…"
                maxLength={120}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          className="rounded-full"
          disabled={saving}
          onClick={() =>
            onSave(
              Array.from(checked).map((refId) => ({ refId, custom_value: custom[refId] ?? null })),
            )
          }
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
