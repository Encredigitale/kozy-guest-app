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
import { BookUser, Cake, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { daysUntilBirthday, formatBirthday } from "./birthdays";

export default function ContactsBookWidget({ config }: WidgetProps) {
  const scope = { scope_type: "global" as const, scope_id: null };
  const { items, isLoading, create, update, remove, upsertSingle } = useWidgetItems("contacts.book", scope);

  const [draft, setDraft] = useState<Record<string, unknown>>({ name: "", email: "", phone: "", birthday: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", email: "", phone: "", birthday: "" });

  const startEdit = (id: string, payload: Record<string, unknown>) => {
    setEditingId(id);
    setEditDraft({
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      phone: String(payload.phone ?? ""),
      birthday: String(payload.birthday ?? ""),
    });
  };

  const saveEdit = (item: { id: string; payload: Record<string, unknown> }) => {
    if (!editDraft.name.trim()) return toast.error("Le nom est obligatoire.");
    update.mutate(
      { id: item.id, patch: { payload: { ...item.payload, ...editDraft, name: editDraft.name.trim() } } },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success("Contact modifié.");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Modification impossible."),
      },
    );
  };

  const add = () => {
    if (!draft.name) return toast.error("Champ requis manquant.");
    
    create.mutate(
      { payload: { ...draft } },
      { onSuccess: () => setDraft({ name: "", email: "", phone: "", birthday: "" }) },
    );
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <BookUser className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Carnet d'adresses</CardTitle>
            <CardDescription>Vos contacts réutilisables.</CardDescription>
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
              <li key={i.id} className="group py-1.5 border-b border-border/40 last:border-0">
                {editingId === i.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        placeholder="Nom du contact"
                      />
                      <Input
                        type="email"
                        value={editDraft.email}
                        onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                        placeholder="email@exemple.com"
                      />
                      <Input
                        value={editDraft.phone}
                        onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                        placeholder="+33 …"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date d'anniversaire</Label>
                        <Input
                          type="date"
                          className="w-full min-w-0"
                          value={editDraft.birthday}
                          onChange={(e) => setEditDraft({ ...editDraft, birthday: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" /> Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={update.isPending}
                        onClick={() => saveEdit(i)}
                      >
                        <Check className="h-3.5 w-3.5" /> Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{String(i.payload.name ?? "")}</p>
                      <p className="text-xs text-muted-foreground truncate">{String(i.payload.email ?? "")}</p>
                      <p className="text-xs text-muted-foreground truncate">{String(i.payload.phone ?? "")}</p>
                      {i.payload.birthday ? (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Cake className="h-3 w-3 text-primary" />
                          {formatBirthday(String(i.payload.birthday))}
                          {(() => {
                            const d = daysUntilBirthday(String(i.payload.birthday));
                            if (d === null || d > 15) return null;
                            return (
                              <span className="text-primary font-medium">
                                {d === 0 ? "· aujourd'hui 🎉" : `· dans ${d} j`}
                              </span>
                            );
                          })()}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => startEdit(i.id, i.payload)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => remove.mutate(i.id)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 pt-2 border-t border-border/40">
          <div className="grid grid-cols-3 gap-2">
          <Input
            
            value={(draft.name as string) ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nom du contact"
          />
          <Input
            type="email"
            value={(draft.email as string) ?? ""}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="email@exemple.com"
          />
          <Input
            
            value={(draft.phone as string) ?? ""}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+33 …"
          />
          <div className="space-y-1 col-span-3 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Date d'anniversaire</Label>
            <Input
              type="date"
              className="w-full min-w-0"
              value={(draft.birthday as string) ?? ""}
              onChange={(e) => setDraft({ ...draft, birthday: e.target.value })}
            />
          </div>
          </div>
          <Button onClick={add} disabled={create.isPending} size="sm" className="rounded-full self-end">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
