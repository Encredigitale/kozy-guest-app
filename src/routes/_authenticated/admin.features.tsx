import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { listAdminData, toggleExtension } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/features")({
  head: () => ({ meta: [{ title: "Fonctionnalités — Studio d'administration" }] }),
  component: Features,
});

function Features() {
  const list = useServerFn(listAdminData);
  const toggle = useServerFn(toggleExtension);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "extensions"], queryFn: () => list({ data: { kind: "extensions" } }) });
  const onToggle = async (key: string, enabled: boolean) => {
    try {
      await toggle({ data: { key, enabled } });
      toast.success(enabled ? "Fonctionnalité activée" : "Fonctionnalité désactivée");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch { toast.error("Mise à jour impossible."); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="font-serif text-2xl">Fonctionnalités</h2><p className="text-sm text-muted-foreground">Module Registry.</p></div>
        <Link to="/app/admin/extensions" className="text-sm underline">Réglages avancés</Link>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      <ul className="divide-y divide-border rounded-lg border-2 border-primary bg-card">
        {(data?.rows ?? []).map((e: any) => (
          <li key={e.key} className="flex items-center justify-between gap-3 px-4 py-3">
            <div><p className="font-semibold">{e.name}</p><p className="text-xs text-muted-foreground">v{e.version} · {e.enabled ? "● Active" : "○ Inactive"}</p></div>
            <Switch checked={e.enabled} onCheckedChange={(v) => onToggle(e.key, v)} aria-label={e.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}
