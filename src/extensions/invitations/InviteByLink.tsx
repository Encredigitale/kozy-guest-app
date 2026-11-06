import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getEventInvitationLink, manageEventInvitationLink } from "@/lib/invitation-links.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function InviteByLink({ eventId, status, management = false }: { eventId: string; title: string; status: string; management?: boolean }) {
  const getLink = useServerFn(getEventInvitationLink);
  const manageLink = useServerFn(manageEventInvitationLink);
  const qc = useQueryClient();
  const [action, setAction] = useState<"disable" | "regenerate" | null>(null);
  const [busy, setBusy] = useState(false);
  const queryKey = ["invitations", "free-link", eventId];
  const { data: link, isPending, isError, refetch } = useQuery({ queryKey, queryFn: () => getLink({ data: { eventId } }) });
  const enabled = !!link?.active && status === "published";
  const copy = async () => {
    if (!enabled || !link) return;
    try { await navigator.clipboard.writeText(link.url); toast.success("Lien copié."); }
    catch { toast.error("Copie impossible. Sélectionnez le lien pour le copier."); }
  };
  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try { await manageLink({ data: { eventId, action } }); await qc.invalidateQueries({ queryKey }); setAction(null); toast.success(action === "disable" ? "Lien désactivé." : "Nouveau lien généré."); }
    catch { toast.error("Modification impossible."); }
    finally { setBusy(false); }
  };
  return <section className="min-w-0 space-y-3" aria-label="Inviter par lien">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-serif text-base">Inviter par lien</h2>
      {link && !link.active && <Badge variant="outline">Désactivé</Badge>}
      {management && link && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-auto shrink-0" aria-label="Gérer le lien"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        {link.active && <DropdownMenuItem onSelect={() => setAction("disable")}>Désactiver le lien</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setAction("regenerate")}>Régénérer le lien</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>}
    </div>
    {isPending ? <p className="text-sm text-muted-foreground">Chargement du lien…</p> : isError ? <div role="alert"><p className="text-sm">Lien indisponible.</p><Button variant="outline" onClick={() => refetch()}>Réessayer</Button></div> : <>
      <Input aria-label="Lien d’invitation" value={link?.url ?? ""} readOnly onFocus={(e) => e.target.select()} className="w-full min-w-0 text-sm" />
      {status !== "published" && <p className="text-sm text-muted-foreground">{status === "draft" ? "Publiez votre événement pour ouvrir l’invitation à vos proches." : "Cet événement est archivé : l’invitation est inaccessible."}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} disabled={!enabled}><Copy className="h-4 w-4" /> Copier le lien</Button>
      </div>
    </>}
    <AlertDialog open={!!action} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{action === "disable" ? "Désactiver ce lien ?" : "Régénérer le lien ?"}</AlertDialogTitle><AlertDialogDescription>L’ancien lien partagé ne permettra plus de s’inscrire. Les invitations personnelles déjà créées restent inchangées.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>Confirmer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}