import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import * as Icons from "lucide-react";
import { LogOut, User as UserIcon, LayoutGrid, Settings, Home, Calendar, BookUser, User as ProfileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { useActiveExtensions } from "@/core/extensions";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/core/notifications/NotificationBell";

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
  { key: "create", label: "Créer", to: "/app/events/new", icon: "PlusCircle" },
  { key: "contacts", label: "Contacts", to: "/app/contacts", icon: "BookUser" },
  { key: "profile", label: "Profil", to: "/app/profile", icon: "User" },
  { key: "admin", label: "Administration", to: "/app/admin", icon: "Settings2", adminOnly: true },
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

  const { data: extensions } = useActiveExtensions();
  const extensionLinks = useMemo(() => {
    const links: { to: string; label: string; icon?: string; order: number }[] = [];
    for (let i = 0; i < extensions.length; i++) {
      const ext = extensions[i];
      for (const m of ext.menu ?? []) {
        links.push({
          to: `/app/x/${ext.key}/${m.path}`,
          label: m.label,
          icon: m.icon,
          order: i * 1000 + (m.order ?? 0),
        });
      }
    }
    return links.sort((a, b) => a.order - b.order);
  }, [extensions]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté.");
    navigate({ to: "/" });
  };

  // Non-admin users: no sidebar, top header nav only.
  if (!isAdmin) {
    const USER_NAV = [
      { to: "/app", label: "Accueil", Icon: Home },
      { to: "/app/events", label: "Événements", Icon: Calendar },
      { to: "/app/contacts", label: "Contacts", Icon: BookUser },
      { to: "/app/profile", label: "Profil", Icon: ProfileIcon },
    ];
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 gap-4 shrink-0">
          <Link to="/app" className="font-serif text-xl tracking-tight text-primary">
            Kosy
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {USER_NAV.map(({ to, label, Icon }) => {
              const active = to === "/app"
                ? pathname === "/app"
                : pathname === to || pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent ${
                    active ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Déconnexion</span>
            </Button>
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 overflow-x-hidden flex flex-col">
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 gap-2 shrink-0">
          <Link to="/app" className="font-serif text-xl tracking-tight text-primary">
            Framework
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[200px]">
              {user?.email}
            </span>
            <NotificationBell />

          <Link
            to="/app/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
          >
            <ProfileIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Déconnexion</span>
          </Button>
          </div>
        </header>


        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Re-exports to keep imports terse from route files.
export { Home, Settings, UserIcon };
