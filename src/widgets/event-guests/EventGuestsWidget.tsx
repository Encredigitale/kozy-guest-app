import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WidgetProps } from "@/core/registry/components";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEvent, useParticipants } from "@/widgets/event-shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export default function EventGuestsWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string;
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: ev } = useEvent(eventId);
  const { data: participants = [], isLoading } = useParticipants(eventId);
  const [newEmail, setNewEmail] = useState("");
  const isOrganizer = ev?.organizer_id === user?.id;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["event", eventId, "participants"] });

  const add = async () => {
    const email = newEmail.trim();
    if (!email) return;
    const { error } = await supabase.from("event_participants").insert({ event_id: eventId, email });
    if (error) return toast.error(error.message);
    setNewEmail("");
    toast.success("Invité ajouté.");
    invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("event_participants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!isOrganizer && participants.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader><CardTitle className="text-base">Invités ({participants.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isOrganizer && (
          <div className="flex gap-2">
            <Input type="email" placeholder="email@exemple.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Button onClick={add} className="rounded-full"><UserPlus className="h-4 w-4" /> Inviter</Button>
          </div>
        )}
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun invité.</p>
        ) : (
          <ul className="divide-y">
            {participants.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{p.email ?? p.user_id}</p>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                </div>
                {isOrganizer && (
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
