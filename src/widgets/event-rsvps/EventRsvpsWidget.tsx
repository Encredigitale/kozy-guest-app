import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { WidgetContext } from "@/core/widgets";

type Rsvp = {
  id: string;
  guest_name: string;
  status: "yes" | "no" | "maybe";
  message: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<Rsvp["status"], string> = {
  yes: "Oui",
  maybe: "Peut-être",
  no: "Non",
};

export function EventRsvpsWidget({ context }: { context: WidgetContext }) {
  const eventId = context.eventId as string;
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("event_rsvps")
        .select("id, guest_name, status, message, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      setRsvps((data ?? []) as Rsvp[]);
    })();
  }, [eventId]);

  const removeRsvp = async (id: string) => {
    const { error } = await supabase.from("event_rsvps").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    setRsvps((r) => r.filter((x) => x.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Réponses ({rsvps.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rsvps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune réponse pour l'instant.</p>
        ) : (
          <ul className="divide-y">
            {rsvps.map((r) => (
              <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {r.guest_name}{" "}
                    <span className={
                      r.status === "yes"
                        ? "text-xs ml-1 text-green-700"
                        : r.status === "no"
                          ? "text-xs ml-1 text-destructive"
                          : "text-xs ml-1 text-muted-foreground"
                    }>
                      · {STATUS_LABELS[r.status]}
                    </span>
                  </p>
                  {r.message && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRsvp(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la réponse"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
