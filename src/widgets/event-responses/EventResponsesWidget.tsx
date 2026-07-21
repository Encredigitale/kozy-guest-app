import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { WidgetProps } from "@/core/registry/components";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { sendNotification } from "@/lib/notifications.functions";
import { useEvent, useParticipants } from "@/widgets/event-shared/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EventResponsesWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  const { user } = useSession();
  const qc = useQueryClient();
  const notify = useServerFn(sendNotification);
  const { data: ev } = useEvent(eventId);
  const { data: participants = [] } = useParticipants(eventId);

  if (!ev) return null;

  const isOrganizer = ev.organizer_id === user?.id;
  const selfRow = participants.find((p) => p.user_id === user?.id);
  const accepted = participants.filter((p) => p.rsvp_status === "accepted").length;
  const declined = participants.filter((p) => p.rsvp_status === "declined").length;
  const pending = participants.filter((p) => p.rsvp_status === "pending").length;

  const rsvp = async (status: "accepted" | "declined") => {
    if (!selfRow) return;
    const { error } = await supabase.from("event_participants").update({ rsvp_status: status }).eq("id", selfRow.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["event", eventId, "participants"] });
    try {
      await notify({ data: { userId: ev.organizer_id, channel: "inapp", type: "event.rsvp",
        title: `Réponse à "${ev.title}"`, body: `${user?.email} a répondu : ${status === "accepted" ? "accepté" : "refusé"}.`,
        metadata: { event_id: ev.id, status } } });
    } catch { /* silent */ }
    toast.success("Réponse enregistrée.");
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Réponses</CardTitle>
        <CardDescription>
          {accepted} acceptée{accepted > 1 ? "s" : ""} · {declined} refusée{declined > 1 ? "s" : ""} · {pending} en attente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Stat label="Acceptées" value={accepted} tone="text-emerald-600" />
          <Stat label="Refusées" value={declined} tone="text-destructive" />
          <Stat label="En attente" value={pending} tone="text-muted-foreground" />
        </div>
        {selfRow && !isOrganizer && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-sm">Votre réponse : <span className="font-medium">{selfRow.rsvp_status}</span></p>
            <div className="flex gap-2">
              <Button onClick={() => rsvp("accepted")} className="rounded-full">J'accepte</Button>
              <Button onClick={() => rsvp("declined")} variant="outline" className="rounded-full">Je refuse</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border/60 p-3 text-center">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
