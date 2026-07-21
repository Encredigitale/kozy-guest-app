import { useEffect, useMemo, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Plus, Trash2 } from "lucide-react";

// Widget: Historique
// Auto-contenu : stockage local (localStorage) par événement/utilisateur.
// Aucune dépendance à un autre widget. Peut être remplacé par un backend dédié.

type Item = { id: string; label: string; done?: boolean };

export default function EventHistoryWidget({ config }: WidgetProps) {
  const scope = (config?.eventId as string | undefined) ?? "global";
  const storageKey = `widget.history.${scope}`;

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
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Historique</CardTitle>
            <CardDescription>Journal des modifications de l'événement.</CardDescription>
          </div>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Ajouter un élément…"
          />
          <Button onClick={add} size="icon" variant="secondary" className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Aucun élément pour l'instant.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 group py-1.5">
                
                <span className={`flex-1 text-sm ${i.done ? "line-through text-muted-foreground" : ""}`}>
                  {i.label}
                </span>
                <button
                  onClick={() => remove(i.id)}
                  className="opacity-0 group-hover:opacity-100 transition"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
        
      </CardContent>
    </Card>
  );
}
