import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { WidgetContext } from "@/core/widgets";

type Item = {
  id: string;
  label: string;
  done: boolean;
  position: number;
};

export function EventChecklistWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string | undefined;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data, error } = await supabase
        .from("event_checklist_items")
        .select("id, label, done, position")
        .eq("event_id", eventId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && data) setItems(data);
      setLoading(false);
    })();
  }, [eventId]);

  const addItem = async () => {
    if (!eventId || !label.trim()) return;
    setAdding(true);
    const nextPos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("event_checklist_items")
      .insert({ event_id: eventId, label: label.trim(), position: nextPos })
      .select("id, label, done, position")
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Impossible d'ajouter cet élément.");
      return;
    }
    setItems((prev) => [...prev, data]);
    setLabel("");
  };

  const toggle = async (item: Item) => {
    const next = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    const { error } = await supabase
      .from("event_checklist_items")
      .update({ done: next })
      .eq("id", item.id);
    if (error) {
      toast.error("Mise à jour impossible.");
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !next } : i)));
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error } = await supabase.from("event_checklist_items").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      setItems(prev);
    }
  };

  const done = items.filter((i) => i.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-5 w-5" />
          Checklist
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {done} / {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune tâche pour l'instant. Ajoutez ce qu'il reste à préparer.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
              >
                <Checkbox checked={item.done} onCheckedChange={() => toggle(item)} />
                <span
                  className={
                    item.done
                      ? "flex-1 text-sm text-muted-foreground line-through"
                      : "flex-1 text-sm"
                  }
                >
                  {item.label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Louer des chaises, préparer la playlist…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            className="h-10 rounded-xl"
          />
          <Button onClick={addItem} disabled={adding || !label.trim()} className="rounded-xl">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
