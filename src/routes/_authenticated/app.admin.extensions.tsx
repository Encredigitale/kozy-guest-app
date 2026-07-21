import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useExtensions, extensionsQueryOptions, EXTENSIONS } from "@/core/extensions";
import { checkExtensionCompatibility, CORE_VERSION, DB_VERSION } from "@/core/version";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Puzzle, Settings, PackagePlus, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import type { ExtensionRow } from "@/core/extensions";

export const Route = createFileRoute("/_authenticated/app/admin/extensions")({
  head: () => ({ meta: [{ title: "Extensions — Admin" }] }),
  component: AdminExtensions,
});

function AdminExtensions() {
  const { isAdmin, loading } = useSession();
  const { data: rows, isLoading } = useExtensions();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: extensionsQueryOptions.queryKey });

  const toggle = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean; row: ExtensionRow }) => {
      if (input.enabled) {
        const compat = checkExtensionCompatibility(input.row);
        if (!compat.ok) throw new Error(compat.reason);
      }
      const { error } = await supabase.from("extensions").update({ enabled: input.enabled }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const reorder = useMutation({
    mutationFn: async (input: { id: string; direction: "up" | "down" }) => {
      const list = [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const idx = list.findIndex((r) => r.id === input.id);
      const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
      const a = list[idx];
      const b = list[swapIdx];
      await supabase.from("extensions").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("extensions").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: invalidate,
  });

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/app" />;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="font-serif text-3xl">Extensions</h1>
          <p className="text-sm text-muted-foreground">
            Core v{CORE_VERSION} · DB v{DB_VERSION}. Activez, réordonnez ou configurez les plugins.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/extensions/install">
            <PackagePlus className="h-4 w-4" /> Installer via manifest
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid gap-3">
          {(rows ?? []).map((row) => {
            const code = EXTENSIONS.find((e) => e.key === row.key);
            const compat = checkExtensionCompatibility(row);
            return (
              <Card key={row.id} className="rounded-2xl border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => reorder.mutate({ id: row.id, direction: "up" })}
                        className="h-4 w-4 grid place-items-center hover:bg-accent rounded"
                        aria-label="Monter"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => reorder.mutate({ id: row.id, direction: "down" })}
                        className="h-4 w-4 grid place-items-center hover:bg-accent rounded"
                        aria-label="Descendre"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        {row.name}
                        <Badge variant="outline" className="text-[10px]">v{row.version}</Badge>
                        {row.category && <Badge variant="outline">{row.category}</Badge>}
                        {row.scope && <Badge variant="secondary" className="text-[10px]">{row.scope}</Badge>}
                        {!code && <Badge variant="destructive">Code manquant</Badge>}
                        {code && !compat.ok && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Incompatible
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{row.description ?? "—"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {code && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/app/admin/extensions/$key" params={{ key: row.key }}>
                            <Settings className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                      <Switch
                        checked={row.enabled}
                        disabled={!code || !compat.ok || toggle.isPending}
                        onCheckedChange={(checked) => toggle.mutate({ id: row.id, enabled: checked, row })}
                      />
                    </div>
                  </div>
                </CardHeader>
                {(code || !compat.ok) && (
                  <CardContent className="pt-0 space-y-2">
                    {!compat.ok && (
                      <p className="text-xs text-destructive">{compat.reason}</p>
                    )}
                    {code && (
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
                    )}
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
