import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Studio d'administration" }] }),
  component: AdminDashboard,
});

type Stats = Awaited<ReturnType<typeof getAdminStats>>;
type WidgetDef = { id: string; title: string; render: (s: Stats) => React.ReactNode; wide?: boolean };

function Kpi({ value, sub }: { value: React.ReactNode; sub: string }) {
  return (<><p className="font-serif text-4xl">{value}</p><p className="mt-1 text-sm text-muted-foreground">{sub}</p></>);
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `Il y a ${m} min`;
  if (m < 1440) return `Il y a ${Math.round(m / 60)} h`;
  return `Il y a ${Math.round(m / 1440)} j`;
}

const WIDGETS: WidgetDef[] = [
  { id: "users", title: "Utilisateurs", render: (s) => <Kpi value={s.users.toLocaleString("fr-FR")} sub={`+${s.usersMonth} ce mois`} /> },
  { id: "events", title: "Événements", render: (s) => <Kpi value={s.events.toLocaleString("fr-FR")} sub={`${s.upcoming} à venir`} /> },
  { id: "invitations", title: "Invitations", render: (s) => <Kpi value={s.invitations.toLocaleString("fr-FR")} sub={`${s.invitations ? Math.round((s.accepted / s.invitations) * 100) : 0} % acceptées`} /> },
  { id: "features", title: "Fonctionnalités actives", render: (s) => <Kpi value={`${s.extActive} / ${s.extTotal}`} sub="modules activés" /> },
  { id: "activity", title: "Activité récente", wide: true, render: (s) => (
    s.activity.length === 0 ? <p className="text-sm text-muted-foreground">Aucune activité.</p> :
    <ul className="divide-y divide-border">{s.activity.map((a, i) => (
      <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
        <div className="min-w-0"><p className="font-semibold">{a.kind}</p><p className="truncate text-muted-foreground">{a.label}</p></div>
        <span className="shrink-0 text-xs text-muted-foreground">{ago(a.at)}</span>
      </li>))}</ul>
  ) },
];

const KEY = "kozy_admin_dashboard_layout";
type Layout = { id: string; visible: boolean }[];

function AdminDashboard() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fn() });
  const [layout, setLayout] = useState<Layout>(WIDGETS.map((w) => ({ id: w.id, visible: true })));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Layout | null;
      if (saved) setLayout([...saved.filter((l) => WIDGETS.some((w) => w.id === l.id)), ...WIDGETS.filter((w) => !saved.some((l) => l.id === w.id)).map((w) => ({ id: w.id, visible: true }))]);
    } catch { /* ignore */ }
  }, []);
  const save = (l: Layout) => { setLayout(l); localStorage.setItem(KEY, JSON.stringify(l)); };
  const move = (i: number, d: number) => { const l = [...layout]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; save(l); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-serif text-2xl">Tableau de bord</h2><p className="text-sm text-muted-foreground">Vue générale de l'application.</p></div>
        <button className="text-sm underline" onClick={() => setEditing((v) => !v)}>{editing ? "Terminer" : "Personnaliser"}</button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {error && <p className="text-sm text-destructive">Impossible de charger les indicateurs.</p>}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {layout.map((l, i) => {
            const w = WIDGETS.find((x) => x.id === l.id)!;
            if (!l.visible && !editing) return null;
            return (
              <section key={l.id} className={`rounded-lg border-2 border-primary bg-card p-4 shadow-[4px_4px_0_var(--color-accent)] ${w.wide ? "sm:col-span-2 xl:col-span-4" : ""} ${!l.visible ? "opacity-40" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{w.title}</h3>
                  {editing && (
                    <div className="flex gap-1">
                      <button aria-label="Monter" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button aria-label="Descendre" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                      <button aria-label={l.visible ? "Masquer" : "Afficher"} onClick={() => save(layout.map((x) => x.id === l.id ? { ...x, visible: !x.visible } : x))}>
                        {l.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
                {w.render(data)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
