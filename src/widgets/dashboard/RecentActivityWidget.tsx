import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/core/auth/useSession";
import { Activity } from "lucide-react";

export default function RecentActivityWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "activity", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id,action,target_type,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="rounded-2xl border-border/60 h-full">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Activité récente</p>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Rien de récent à afficher.</p>
        ) : (
          <ul className="space-y-1">
            {data.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-2 rounded-md">
                <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <p className="text-sm truncate"><span className="font-medium">{a.action}</span> · <span className="text-muted-foreground">{a.target_type ?? "—"}</span></p>
                  <p className="text-xs text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
