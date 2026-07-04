import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Plus, X } from "lucide-react";
import type { WidgetContext } from "@/core/widgets";

type Guest = { id: string; name: string; email: string | null; invite_token: string };

export function EventGuestsWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string;
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [guestEmailInput, setGuestEmailInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("event_guests")
        .select("id, name, email, invite_token")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      setGuests((data ?? []) as Guest[]);
    })();
  }, [eventId]);

  const addGuest = async () => {
    const name = guestInput.trim();
    const email = guestEmailInput.trim();
    if (!name) return;
    if (email) {
      setInviting(true);
      try {
        const { sendEventInvitation } = await import("@/lib/invitations.functions");
        const res = await sendEventInvitation({ data: { eventId, name, email } });
        setGuests((g) => [...g, res.guest as Guest]);
        setGuestInput("");
        setGuestEmailInput("");
        toast.success("Invitation envoyée !");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Envoi impossible.";
        toast.error(msg);
      } finally {
        setInviting(false);
      }
      return;
    }
    const { data, error } = await supabase
      .from("event_guests")
      .insert({ event_id: eventId, name, email: null })
      .select("id, name, email, invite_token")
      .single();
    if (error || !data) {
      toast.error("Ajout impossible.");
      return;
    }
    setGuests((g) => [...g, data as Guest]);
    setGuestInput("");
    setGuestEmailInput("");
  };

  const removeGuest = async (id: string) => {
    const { error } = await supabase.from("event_guests").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setGuests((g) => g.filter((x) => x.id !== id));
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const personalInviteUrl = (guest: Guest) =>
    origin ? `${origin}/invitation/${eventId}/${guest.id}?token=${guest.invite_token}` : "";

  const copyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const resendInvite = async (guest: Guest) => {
    if (!guest.email) return;
    setResendingId(guest.id);
    try {
      const { sendEventInvitation } = await import("@/lib/invitations.functions");
      await sendEventInvitation({ data: { eventId, name: guest.name, email: guest.email } });
      toast.success(`Invitation renvoyée à ${guest.name}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Envoi impossible.";
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invités prévus ({guests.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="Prénom"
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addGuest(); }
            }}
          />
          <Input
            type="email"
            placeholder="Email (optionnel)"
            value={guestEmailInput}
            onChange={(e) => setGuestEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addGuest(); }
            }}
          />
          <Button type="button" variant="outline" onClick={addGuest} disabled={inviting}>
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {guestEmailInput.trim() ? "Inviter" : "Ajouter"}
          </Button>
        </div>
        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun invité noté pour le moment.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {guests.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{g.name}</p>
                  {g.email && (
                    <p className="text-xs text-muted-foreground truncate">{g.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {g.email && (
                    <>
                      <button
                        type="button"
                        onClick={() => copyInvite(personalInviteUrl(g))}
                        className="p-1 text-muted-foreground hover:text-primary"
                        title="Copier le lien personnel"
                        aria-label={`Copier le lien personnel pour ${g.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => resendInvite(g)}
                        disabled={resendingId === g.id}
                        className="p-1 text-muted-foreground hover:text-primary disabled:opacity-50"
                        title="Renvoyer l'invitation par email"
                        aria-label={`Renvoyer l'invitation à ${g.name}`}
                      >
                        {resendingId === g.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeGuest(g.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Retirer ${g.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
