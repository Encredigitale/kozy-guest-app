import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  target: string | null;
  metadata: unknown;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/app/audit")({
  head: () => ({ meta: [{ title: "Journal d'audit — Framework" }] }),
  component: AuditPage,
});

const PAGE_SIZE = 50;

function AuditPage() {
  const { isAdmin } = useSession();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_log")
      .select("id, user_id, action, target, metadata, created_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (filter) q = q.ilike("action", `%${filter}%`);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Journal d'audit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Toutes les actions enregistrées sur la plateforme."
            : "Vos actions et appels API récents."}
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Événements</CardTitle>
            <CardDescription>Triés du plus récent au plus ancien.</CardDescription>
          </div>
          <input
            className="h-9 px-3 rounded-md border border-border/60 bg-background text-sm"
            placeholder="Filtrer par action…"
            value={filter}
            onChange={(e) => {
              setPage(0);
              setFilter(e.target.value);
            }}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement.</p>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[160px_1fr_auto] gap-3 items-center px-3 py-2 rounded-md hover:bg-accent/40 text-sm"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono text-xs">{r.action}</span>
                    {r.target && (
                      <span className="text-xs text-muted-foreground ml-2 truncate">
                        → {r.target}
                      </span>
                    )}
                  </div>
                  <details className="justify-self-end">
                    <summary className="text-xs text-muted-foreground cursor-pointer">détails</summary>
                    <pre className="text-[10px] mt-1 p-2 bg-muted/40 rounded max-w-md overflow-auto">
                      {JSON.stringify(r.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Précédent
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={rows.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
