import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WidgetProps } from "@/core/registry/components";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEvent, useParticipants } from "@/widgets/event-shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";

function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const [local] = email.split("@");
  if (!local) return "?";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function avatarColor(email: string | null): string {
  if (!email) return "bg-muted text-muted-foreground";
  const colors = [
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function rsvpBadge(status: "pending" | "accepted" | "declined") {
  switch (status) {
    case "accepted":
      return { label: "Accepté", variant: "secondary" as const };
    case "declined":
      return { label: "Décliné", variant: "destructive" as const };
    default:
      return { label: "En attente", variant: "outline" as const };
  }
}

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

  const acceptedCount = participants.filter((p) => p.rsvp_status === "accepted").length;

  return (
    <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Invités
          </CardTitle>
          <Badge variant="secondary" className="rounded-full font-medium">
            {acceptedCount} / {participants.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOrganizer && (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="rounded-2xl h-11 bg-background"
            />
            <Button onClick={add} className="rounded-full h-11 px-4 shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter
            </Button>
          </div>
        )}

        {participants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun invité pour le moment.</p>
            {isOrganizer && (
              <p className="text-xs text-muted-foreground mt-1">
                Ajoutez un email pour envoyer une invitation.
              </p>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {participants.map((p) => {
              const rsvp = rsvpBadge(p.rsvp_status);
              return (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-sm transition-colors hover:border-primary/20 hover:shadow-sm"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className={avatarColor(p.email)}>
                      {initialsFromEmail(p.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">
                      {p.email ?? "Invité"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge
                        variant={p.role === "organizer" ? "default" : "outline"}
                        className="rounded-full text-[10px] px-2 py-0.5 font-medium"
                      >
                        {p.role === "organizer" ? "Organisateur" : "Invité"}
                      </Badge>
                      <Badge
                        variant={rsvp.variant}
                        className="rounded-full text-[10px] px-2 py-0.5 font-medium"
                      >
                        {rsvp.label}
                      </Badge>
                    </div>
                  </div>

                  {isOrganizer && (
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => toast.info("Envoi d'invitation", { description: "Fonctionnalité à brancher au service d'envoi." })}
                        title="Envoyer l'invitation"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => remove(p.id)}
                        title="Retirer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
