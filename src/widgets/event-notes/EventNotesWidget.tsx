import { useEffect, useMemo, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StickyNote, Plus, Trash2 } from "lucide-react";

// Widget: Notes
// Auto-contenu : stockage local (localStorage) par événement/utilisateur.
// Aucune dépendance à un autre widget. Peut être remplacé par un backend dédié.

type Item = { id: string; label: string; done?: boolean };

export default function EventNotesWidget({ config }: WidgetProps) {
  const scope = (config?.eventId as string | undefined) ?? "global";
  const storageKey = `widget.notes.${scope}`;

  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, loaded, storageKey]);

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter((i) => i.done).length,
  }), [items]);

  const add = () => {
    const label = text.trim();
    if (!label) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    setText("");
  };
  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <StickyNote className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>Notes privées de l'organisateur.</CardDescription>
          </div>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <Textarea
          value={items[0]?.label ?? ""}
          onChange={(e) =>
            setItems([{ id: items[0]?.id ?? crypto.randomUUID(), label: e.target.value }])
          }
          placeholder="Écrire ici…"
          className="min-h-32"
        />
        
      </CardContent>
    </Card>
  );
}
