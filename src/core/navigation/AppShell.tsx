import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import * as Icons from "lucide-react";
import { LogOut, User as UserIcon, LayoutGrid, Settings, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";

type CoreLink = {
  key: string;
  label: string;
  to: string;
  icon: keyof typeof Icons;
  adminOnly?: boolean;
};

const CORE_LINKS: CoreLink[] = [
  { key: "home", label: "Accueil", to: "/app", icon: "Home" },
  { key: "events", label: "Événements", to: "/app/events", icon: "Calendar" },
  { key: "notifications", label: "Notifications", to: "/app/notifications", icon: "Bell" },
  { key: "profile", label: "Profil", to: "/app/profile", icon: "User" },
  { key: "registry", label: "Registry", to: "/app/admin/registry", icon: "LayoutGrid", adminOnly: true },
];

function DynIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return <LayoutGrid className={className} />;
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Cmp ? <Cmp className={className} /> : <LayoutGrid className={className} />;
}

export function AppShell() {
  const navigate = useNavigate();
  const { user, isAdmin } = useSession();
  const { data: widgets } = useActiveWidgets();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const widgetLinks = useMemo(() => {
    return widgets
      .filter((w) => w.manifest?.menu && w.manifest?.path)
      .filter((w) => {
        const perms = w.manifest.permissions ?? [];
        if (perms.length === 0) return true;
        if (perms.includes("admin") && !isAdmin) return false;
        return true;
      })
      .sort((a, b) => (a.manifest.menu?.order ?? 0) - (b.manifest.menu?.order ?? 0));
  }, [widgets, isAdmin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté.");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/60 flex flex-col p-4 gap-6 shrink-0">
        <div>
          <Link to="/app" className="font-serif text-xl tracking-tight text-primary">
            Framework
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Core · v1</p>
        </div>

        <nav className="flex-1 space-y-6 text-sm">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-2">Core</p>
            {CORE_LINKS.filter((l) => !l.adminOnly || isAdmin).map((l) => {
              const Icon = Icons[l.icon] as React.ComponentType<{ className?: string }>;
              const active = pathname === l.to || (l.to !== "/app" && pathname.startsWith(l.to));
              return (
                <Link
                  key={l.key}
                  to={l.to}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent ${
                    active ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
          </div>

          {widgetLinks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground px-2">Widgets</p>
              {widgetLinks.map((w) => {
                const to = `/app/w/${(w.manifest.path ?? "").replace(/^\//, "")}`;
                const active = pathname === to;
                return (
                  <Link
                    key={w.id}
                    to={to}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent ${
                      active ? "bg-accent text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <DynIcon name={w.manifest.menu?.icon} className="h-4 w-4" />
                    {w.manifest.menu?.label ?? w.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className="border-t border-border/60 pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="truncate">{user?.email}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

// Re-exports to keep imports terse from route files.
export { Home, Settings, UserIcon };
