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
import { Wallet, Plus, Trash2 } from "lucide-react";

export default function EventBudgetWidget({ config }: WidgetProps) {
  const scope = scopeFromEventId(config?.eventId as string | undefined);
  const { items, isLoading, create, update, remove, upsertSingle } = useWidgetItems("event.budget", scope);

  const [draft, setDraft] = useState<Record<string, unknown>>({ label: "", amount: "" });

  const add = () => {
    if (!draft.label) return toast.error("Champ requis manquant.");
    const amount = Number(draft.amount);
    if (Number.isNaN(amount)) return toast.error("Montant invalide.");
    create.mutate(
      { payload: { ...draft, amount } },
      { onSuccess: () => setDraft({ label: "", amount: "" }) },
    );
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Budget</CardTitle>
            <CardDescription>Suivi des dépenses.</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucun élément.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 group py-1.5 border-b border-border/40 last:border-0">
                <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{String(i.payload.label ?? "")}</p>
                </div>
                <span className="text-sm font-mono">{Number(i.payload.amount ?? 0).toFixed(2)} €</span>
              </>
                <button
                  onClick={() => remove.mutate(i.id)}
                  className="opacity-0 group-hover:opacity-100 transition"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between text-sm border-t pt-3 mt-2">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{items.reduce((s, i) => s + (Number(i.payload.amount) || 0), 0).toFixed(2)} €</span>
        </div>
        <div className="grid gap-2 pt-2 border-t border-border/40">
          <div className="grid grid-cols-2 gap-2">
          <Input
            
            value={(draft.label as string) ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Traiteur"
          />
          <Input
            type="number"
            value={(draft.amount as number | string) ?? ""}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="0"
          />
          </div>
          <Button onClick={add} disabled={create.isPending} size="sm" className="rounded-full self-end">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
