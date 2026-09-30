import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Eye } from "lucide-react";
import { useSession } from "@/core/auth/useSession";

const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const Route = createFileRoute("/_authenticated/app/events/")({
  head: () => ({ meta: [
    { title: "Événements — Ma Belle Table" },
    { name: "description", content: "Retrouvez les événements que vous organisez et ceux auxquels vous participez." },
    { property: "og:title", content: "Événements — Ma Belle Table" },
    { property: "og:description", content: "Retrouvez les événements que vous organisez et ceux auxquels vous participez." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EventsListPage,
});

type EventRow = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  starts_at: string | null;
  location: string | null;
};

function EventsListPage() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["core", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, organizer_id, title, description, status, starts_at, location")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  return (
    <div className="kozy-page min-h-screen max-w-5xl">
      <div className="kozy-title-band flex items-start justify-between gap-4 p-5 md:p-6">
        <div>
          <h1 className="font-serif text-3xl text-primary">Événements</h1>
          <p className="text-sm text-foreground/70 mt-1">Vos événements et ceux auxquels vous participez.</p>
        </div>
        <Button asChild className="rounded-full"><Link to="/app/events/new"><Plus className="h-4 w-4" /> Nouveau</Link></Button>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Aucun événement.
            </CardContent>
          </Card>
        ) : (
          (data ?? []).map((e) => (
            <Link key={e.id} to="/app/events/$eventId" params={{ eventId: e.id }}>
              <Card className="hover:-translate-y-0.5 hover:border-primary transition-[transform,border-color]">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      {e.description && <CardDescription className="line-clamp-1">{e.description}</CardDescription>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {user && e.organizer_id !== user.id && (
                        <Badge variant="outline" className="gap-1 rounded-full text-[11px]">
                          <Eye className="h-3 w-3" /> Invité · lecture seule
                        </Badge>
                      )}
                      <Badge variant={e.status === "published" ? "default" : "secondary"}>{EVENT_STATUS_LABELS[e.status] ?? e.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-4 text-xs text-muted-foreground">
                  {e.starts_at && (<span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(e.starts_at).toLocaleString("fr-FR")}</span>)}
                  {e.location && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>)}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
