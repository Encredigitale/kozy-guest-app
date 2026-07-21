import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useExtensions, extensionsQueryOptions, EXTENSIONS } from "@/core/extensions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Puzzle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/extensions")({
  head: () => ({ meta: [{ title: "Extensions — Admin" }] }),
  component: AdminExtensions,
});

function AdminExtensions() {
  const { isAdmin, loading } = useSession();
  const { data: rows, isLoading } = useExtensions();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("extensions")
        .update({ enabled: input.enabled })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: extensionsQueryOptions.queryKey }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/app" />;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl">Extensions</h1>
          <p className="text-sm text-muted-foreground">
            Activez ou désactivez les plugins. Une extension ne modifie jamais le Core.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid gap-3">
          {(rows ?? []).map((row) => {
            const code = EXTENSIONS.find((e) => e.key === row.key);
            return (
              <Card key={row.id} className="rounded-2xl border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {row.name}
                        {row.category && <Badge variant="outline">{row.category}</Badge>}
                        {!code && <Badge variant="destructive">Code manquant</Badge>}
                      </CardTitle>
                      <CardDescription>{row.description ?? "—"}</CardDescription>
                    </div>
                    <Switch
                      checked={row.enabled}
                      disabled={!code || toggle.isPending}
                      onCheckedChange={(checked) => toggle.mutate({ id: row.id, enabled: checked })}
                    />
                  </div>
                </CardHeader>
                {code && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {(code.widgets ?? []).map((w) => (
                        <Badge key={w.key} variant="secondary">Widget · {w.key}</Badge>
                      ))}
                      {(code.screens ?? []).map((s) => (
                        <Badge key={s.path} variant="secondary">Écran · /{s.path}</Badge>
                      ))}
                      {(code.menu ?? []).map((m) => (
                        <Badge key={m.path} variant="secondary">Menu · {m.label}</Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
