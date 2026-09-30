import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { CORE_VERSION, DB_VERSION } from "@/core/version";
import {
  Gauge,
  Gift,

  LayoutGrid,
  MonitorSmartphone,
  Puzzle,
  Settings2,
  Tags,
  UtensilsCrossed,
  Wand2,
  Boxes,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Administration — Ma Belle Table" }] }),
  component: AdminLayout,
});

type Item = { to: string; label: string; Icon: React.ComponentType<{ className?: string }> };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Core",
    items: [
      { to: "/app/admin", label: "Tableau de bord", Icon: Gauge },
      { to: "/app/admin/event-types", label: "Types d'événement", Icon: Tags },
      { to: "/app/admin/menu-components", label: "Composantes de repas", Icon: UtensilsCrossed },
      { to: "/app/admin/contribution-types", label: "Types d'apports", Icon: Gift },
      { to: "/app/admin/contributions", label: "Contributions", Icon: Gift },
    ],

  },
  {
    title: "Écrans",
    items: [{ to: "/app/admin/screens", label: "Gestion des écrans", Icon: MonitorSmartphone }],
  },
  {
    title: "Widgets",
    items: [
      { to: "/app/admin/studio", label: "Studio", Icon: Wand2 },
      { to: "/app/admin/registry", label: "Registry", Icon: LayoutGrid },
    ],
  },

  {
    title: "Plugins",
    items: [
      { to: "/app/admin/extensions", label: "Extensions installées", Icon: Puzzle },
      { to: "/app/admin/extensions/install", label: "Ajouter une extension", Icon: Boxes },
    ],
  },
];

function AdminLayout() {
  const { isAdmin, loading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  return (
    <div className="flex min-h-full">
      <aside className="w-60 shrink-0 border-r border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-2 px-2 pb-3 text-sm font-medium">
          <Settings2 className="h-4 w-4" /> Administration
        </div>
        <nav className="space-y-5 text-sm">
          {SECTIONS.map((s) => (
            <div key={s.title} className="space-y-1">
              <p className="px-2 text-[11px] uppercase tracking-wider text-muted-foreground">{s.title}</p>
              {s.items.map(({ to, label, Icon }) => {
                const active = to === "/app/admin" ? pathname === "/app/admin" : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent ${
                      active ? "bg-accent text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <p className="mt-6 px-2 text-[11px] text-muted-foreground">
          Core v{CORE_VERSION} · DB v{DB_VERSION}
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
