import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import type { WidgetProps } from "@/core/registry/components";
import { useWidgetItems } from "@/widgets/_shared/useWidgetItems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookUser, Cake, Check, ChevronRight, Mail, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { daysUntilBirthday, formatBirthday } from "./birthdays";

type Draft = { name: string; email: string; phone: string; birthday: string };
const emptyDraft: Draft = { name: "", email: "", phone: "", birthday: "" };

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Fields({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Nom</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Nom du contact" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">E-mail</Label>
        <Input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} placeholder="email@exemple.com" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Téléphone</Label>
        <Input value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="+33 …" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Date d'anniversaire</Label>
        <Input type="date" className="w-full min-w-0" value={value.birthday} onChange={(e) => onChange({ ...value, birthday: e.target.value })} />
      </div>
    </div>
  );
}

export default function ContactsBookWidget({ config }: WidgetProps) {
  const scope = { scope_type: "global" as const, scope_id: null };
  const { items, isLoading, create, update, remove } = useWidgetItems("contacts.book", scope);
  const search = useSearch({ strict: false }) as { c?: string };

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (search?.c) setOpenId(search.c);
  }, [search?.c]);

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

  const del = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer ce contact ?")) return;
    remove.mutate(id, {
      onSuccess: () => {
        if (openId === id) setOpenId(null);
        toast.success("Contact supprimé.");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Suppression impossible."),
    });
  };

  const add = () => {
    if (!draft.name.trim()) return toast.error("Le nom est obligatoire.");
    create.mutate(
      { payload: { ...draft, name: draft.name.trim() } },
      {
        onSuccess: () => {
          setDraft(emptyDraft);
          toast.success("Contact ajouté.");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Ajout impossible."),
      },
    );
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 grid place-items-center">
            <BookUser className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">Carnet d'adresses</CardTitle>
            <CardDescription>Vos contacts réutilisables.</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucun contact pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
            {items.map((i) => {
              const name = String(i.payload.name ?? "");
              const email = String(i.payload.email ?? "");
              const phone = String(i.payload.phone ?? "");
              const birthday = String(i.payload.birthday ?? "");
              const isOpen = openId === i.id;
              return (
                <li key={i.id} className="bg-card">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(isOpen ? null : i.id);
                      setEditingId(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 grid place-items-center text-xs font-semibold text-primary">
                      {initialsOf(name) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email || phone || "—"}</p>
                    </div>
                    {isOpen ? (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen ? (
                    <div className="px-3 pb-4 pt-1 border-t border-border/40 bg-accent/20">
                      {editingId === i.id ? (
                        <div className="space-y-3 pt-3">
                          <Fields value={editDraft} onChange={setEditDraft} />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" /> Annuler
                            </Button>
                            <Button size="sm" className="rounded-full" disabled={update.isPending} onClick={() => saveEdit(i)}>
                              <Check className="h-3.5 w-3.5" /> Enregistrer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-3">
                          <dl className="space-y-2 text-sm">
                            {email ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <a href={`mailto:${email}`} className="truncate hover:underline">{email}</a>
                              </div>
                            ) : null}
                            {phone ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <a href={`tel:${phone}`} className="truncate hover:underline">{phone}</a>
                              </div>
                            ) : null}
                            {birthday ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <Cake className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span className="truncate">
                                  {formatBirthday(birthday)}
                                  {(() => {
                                    const d = daysUntilBirthday(birthday);
                                    if (d === null || d > 15) return null;
                                    return (
                                      <span className="text-primary font-medium">
                                        {d === 0 ? " · aujourd'hui 🎉" : ` · dans ${d} j`}
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            ) : null}
                            {!email && !phone && !birthday ? (
                              <p className="text-xs text-muted-foreground italic">Aucune information complémentaire.</p>
                            ) : null}
                          </dl>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => startEdit(i.id, i.payload)}>
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full text-destructive" onClick={() => del(i.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Supprimer
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setOpenId(null)}>
                              <X className="h-3.5 w-3.5" /> Fermer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 pt-3 border-t border-border/40">
          <p className="text-sm font-medium">Souhaitez-vous ajouter un contact ?</p>
          <Fields value={draft} onChange={setDraft} />
          <Button onClick={add} disabled={create.isPending} size="sm" className="rounded-full self-end">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
