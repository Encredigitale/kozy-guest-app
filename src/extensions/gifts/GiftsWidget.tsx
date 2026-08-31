import { useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Gift, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/core/auth/useSession";
import { useEvent } from "@/widgets/event-shared/queries";
import { DEFAULT_GIFTS_CONFIG, GIFT_VISIBILITY_LABELS } from "./config";
import { useEventGifts, useGiftMutations, useGiftsConfig } from "./useGifts";
import { GiftForm } from "./GiftForm";
import type { Gift as GiftType } from "./public-types";

const names = (list: GiftType["recipients"]) => list.map((p) => p.display_name_snapshot).join(" & ");

export default function GiftsWidget({ config }: WidgetProps) {
  const eventId = (config?.eventId as string) ?? "";
  const { user } = useSession();
  const { data: ev } = useEvent(eventId);
  const { data: settings = DEFAULT_GIFTS_CONFIG } = useGiftsConfig();
  const { data: gifts = [], isLoading } = useEventGifts(eventId);
  const { create, update, remove } = useGiftMutations(eventId);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const isOrganizer = !!ev && !!user && ev.organizer_id === user.id;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Cadeaux</CardTitle>
            <CardDescription>Ce qui a été offert, à qui et par qui.</CardDescription>
          </div>
          {isOrganizer && !adding && (
            <Button size="sm" className="rounded-full" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Ajouter un cadeau
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && isOrganizer && (
          <GiftForm
            config={settings}
            defaultDate={ev?.starts_at ?? null}
            submitting={create.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(input) =>
              create.mutate(input, {
                onSuccess: () => {
                  setAdding(false);
                  toast.success("Cadeau enregistré.");
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Enregistrement impossible."),
              })
            }
          />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : gifts.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">Aucun cadeau renseigné pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((g) =>
              editingId === g.id && isOrganizer ? (
                <li key={g.id}>
                  <GiftForm
                    config={settings}
                    gift={g}
                    submitting={update.isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(input) =>
                      update.mutate(
                        { ...input, id: g.id },
                        {
                          onSuccess: () => {
                            setEditingId(null);
                            toast.success("Cadeau modifié.");
                          },
                          onError: (e) =>
                            toast.error(e instanceof Error ? e.message : "Modification impossible."),
                        },
                      )
                    }
                  />
                </li>
              ) : (
                <li
                  key={g.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 p-3"
                >
                  <span aria-hidden className="text-lg leading-none">🎁</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.gift_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Pour {names(g.recipients) || "—"} · Offert par {names(g.givers) || "—"}
                    </p>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    {g.note && <p className="text-xs italic text-muted-foreground">{g.note}</p>}
                    {isOrganizer && (
                      <Badge variant="secondary" className="mt-1.5 rounded-full text-[10px]">
                        {GIFT_VISIBILITY_LABELS[g.visibility]}
                      </Badge>
                    )}
                  </div>
                  {isOrganizer && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingId(g.id)}>
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voulez-vous vraiment supprimer ce cadeau ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contact associé n'est pas supprimé de votre carnet d'adresses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                remove.mutate(pendingDelete, {
                  onSuccess: () => toast.success("Cadeau supprimé."),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Suppression impossible."),
                });
                setPendingDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
