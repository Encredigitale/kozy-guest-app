import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { WidgetRenderer } from "@/core/widgets";

export const Route = createFileRoute("/_authenticated/app/events/$eventId")({
  head: () => ({ meta: [{ title: "Moment — Kosy" }] }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: ev, error } = await supabase
        .from("events")
        .select("id, title, event_type")
        .eq("id", eventId)
        .maybeSingle();
      if (error || !ev) {
        toast.error("Moment introuvable.");
        navigate({ to: "/app" });
        return;
      }
      setTitle(ev.title);
      setEventType(ev.event_type);
      setLoading(false);
    })();
  }, [eventId, navigate]);

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    toast.success("Moment supprimé.");
    navigate({ to: "/app" });
  };

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="font-serif text-3xl">{title || "Moment"}</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce moment ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est définitive. Les invités, réponses et contributions liés seront aussi supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={deleteEvent}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/*
        Aucun widget n'est codé en dur ici.
        Le WidgetRenderer interroge le Registry, filtre par surface et type
        d'événement, puis instancie les widgets actifs dans l'ordre défini.
      */}
      <WidgetRenderer
        surface="event.detail"
        context={{ eventId, eventType }}
      />
    </div>
  );
}
