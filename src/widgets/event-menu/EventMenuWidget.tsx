import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { WidgetContext } from "@/core/widgets";

const COURSES = [
  { value: "entree", label: "Entrée" },
  { value: "plat", label: "Plat" },
  { value: "dessert", label: "Dessert" },
  { value: "boisson", label: "Boisson" },
  { value: "autre", label: "Autre" },
] as const;

type Course = (typeof COURSES)[number]["value"];

type Item = {
  id: string;
  label: string;
  course: Course;
  position: number;
};

const courseLabel = (v: string) => COURSES.find((c) => c.value === v)?.label ?? "Autre";

export function EventMenuWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string | undefined;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [course, setCourse] = useState<Course>("plat");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data, error } = await supabase
        .from("event_menu_items")
        .select("id, label, course, position")
        .eq("event_id", eventId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && data) setItems(data as Item[]);
      setLoading(false);
    })();
  }, [eventId]);

  const addItem = async () => {
    if (!eventId || !label.trim()) return;
    setAdding(true);
    const nextPos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("event_menu_items")
      .insert({ event_id: eventId, label: label.trim(), course, position: nextPos })
      .select("id, label, course, position")
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Impossible d'ajouter ce plat.");
      return;
    }
    setItems((prev) => [...prev, data as Item]);
    setLabel("");
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error } = await supabase.from("event_menu_items").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      setItems(prev);
    }
  };

  const grouped = COURSES.map((c) => ({
    course: c,
    items: items.filter((i) => i.course === c.value),
  })).filter((g) => g.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UtensilsCrossed className="h-5 w-5" />
          Menu
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {items.length} élément{items.length > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun plat pour l'instant. Composez le menu à servir.
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.map((g) => (
              <div key={g.course.value}>
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {courseLabel(g.course.value)}
                </div>
                <ul className="space-y-1.5">
                  {g.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
                    >
                      <span className="flex-1 text-sm">{item.label}</span>
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
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Select value={course} onValueChange={(v) => setCourse(v as Course)}>
            <SelectTrigger className="h-10 w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Tarte au citron"
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
