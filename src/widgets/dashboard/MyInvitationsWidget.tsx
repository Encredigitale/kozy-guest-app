import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ChevronRight } from "lucide-react";

export default function MyInvitationsWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "my-invitations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_participants")
        .select("id,role,event_id,events!inner(id,title,starts_at,location)")
        .eq("user_id", user!.id)
        .eq("role", "guest")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Mes invitations</h2>
          <Link to="/app/events" className="text-xs text-primary hover:underline flex items-center gap-1">
            Tout voir <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune invitation en attente.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((p: any) => (
              <li key={p.id}>
                <Link
                  to="/app/events/$eventId"
                  params={{ eventId: p.event_id }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 grid place-items-center shrink-0">
                    <Mail className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.events?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.events?.starts_at ? new Date(p.events.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Date à définir"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
