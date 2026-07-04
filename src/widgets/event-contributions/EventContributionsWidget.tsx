import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import {
  CONTRIBUTION_CATEGORIES,
  contributionCategoryLabel,
  type ContributionCategory,
} from "@/lib/contribution-categories";
import type { WidgetContext } from "@/core/widgets";

type Contribution = {
  id: string;
  category: string;
  label: string;
  claimed_by_name: string | null;
  proposed_by_name: string | null;
};

export function EventContributionsWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string;
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [newContribCategory, setNewContribCategory] = useState<ContributionCategory>("plat");
  const [newContribLabel, setNewContribLabel] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("event_contributions")
        .select("id, category, label, claimed_by_name, proposed_by_name")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      setContributions((data ?? []) as Contribution[]);
    })();
  }, [eventId]);

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContribLabel.trim()) return;
    const { data, error } = await supabase
      .from("event_contributions")
      .insert({
        event_id: eventId,
        category: newContribCategory,
        label: newContribLabel.trim(),
      })
      .select("id, category, label, claimed_by_name, proposed_by_name")
      .single();
    if (error || !data) {
      toast.error("Ajout impossible.");
      return;
    }
    setContributions((cs) => [...cs, data as Contribution]);
    setNewContribLabel("");
  };

  const removeContribution = async (id: string) => {
    const { error } = await supabase.from("event_contributions").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setContributions((cs) => cs.filter((c) => c.id !== id));
  };

  return (
    <Card className="mb-12">
      <CardHeader>
        <CardTitle className="text-base">Contributions ({contributions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addContribution} className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
          <Select value={newContribCategory} onValueChange={(v) => setNewContribCategory(v as ContributionCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTION_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Ex. Vin rouge, salade, dessert…"
            value={newContribLabel}
            onChange={(e) => setNewContribLabel(e.target.value)}
            maxLength={120}
          />
          <Button type="submit" variant="outline">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </form>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun item demandé. Ajoute ce que tu aimerais que les invités apportent.
          </p>
        ) : (
          <ul className="divide-y">
            {contributions.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {contributionCategoryLabel(c.category)}
                    {c.proposed_by_name ? ` · proposé par ${c.proposed_by_name}` : ""}
                  </p>
                  <p className="text-sm truncate">{c.label}</p>
                  {c.claimed_by_name ? (
                    <p className="text-xs text-green-700 inline-flex items-center gap-1 mt-0.5">
                      <Check className="h-3 w-3" /> Apporté par {c.claimed_by_name}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Pas encore pris</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeContribution(c.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
