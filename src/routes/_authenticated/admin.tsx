import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Gauge, Users, Calendar, Mail, Tags, Puzzle, BookUser, Bell, BarChart3, Settings, ScrollText,
  Menu, ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut, User, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchIsSuperAdmin } from "@/core/auth/role";
import { BrandLogo } from "@/core/branding/BrandLogo";
import { NotificationBell } from "@/core/notifications/NotificationBell";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Studio d'administration — Ma Belle Table" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ context }) => {
    const user = (context as any).user;
    let ok = false;
    try {
      ok = await fetchIsSuperAdmin(user.id);
    } catch {
      throw new Error("Impossible de vérifier vos autorisations. Veuillez réessayer.");
    }
    if (!ok) throw redirect({ to: "/app" });
  },
  pendingComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center"><BrandLogo size="lg" textClassName="text-primary" /><p className="mt-4 text-sm text-muted-foreground">Chargement...</p></div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div><p className="font-semibold">{error.message}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Réessayer</Button></div>
    </div>
  ),
  component: AdminStudio,
});

const NAV: { group: string; items: { to: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] }[] = [
  { group: "", items: [{ to: "/admin/dashboard", label: "Tableau de bord", Icon: Gauge }] },
  { group: "Données", items: [
    { to: "/admin/users", label: "Utilisateurs", Icon: Users },
    { to: "/admin/events", label: "Événements", Icon: Calendar },
    { to: "/admin/invitations", label: "Invitations", Icon: Mail },
    { to: "/admin/contacts", label: "Contacts", Icon: BookUser },
  ] },
  { group: "Configuration", items: [
    { to: "/app/admin/event-types", label: "Types d'événements", Icon: Tags },
    { to: "/admin/features", label: "Fonctionnalités", Icon: Puzzle },
    { to: "/admin/notifications", label: "Notifications", Icon: Bell },
  ] },
  { group: "Pilotage", items: [
    { to: "/admin/stats", label: "Statistiques", Icon: BarChart3 },
    { to: "/admin/settings", label: "Paramètres", Icon: Settings },
    { to: "/admin/audit", label: "Journal système", Icon: ScrollText },
  ] },
];

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-4 text-sm">
      {NAV.map((s) => (
        <div key={s.group} className="space-y-1">
          {s.group && !collapsed && <p className="px-3 text-[11px] uppercase tracking-wider text-primary-foreground/60">{s.group}</p>}
          {s.items.map(({ to, label, Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} onClick={onNavigate} title={label}
                className={`flex items-center gap-3 rounded-md px-3 py-2 ${active ? "bg-accent text-accent-foreground" : "text-primary-foreground hover:bg-primary-foreground/10"}`}>
                <Icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function AdminStudio() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`hidden md:flex flex-col shrink-0 bg-primary text-primary-foreground border-r-2 border-primary p-3 transition-all ${collapsed ? "w-16" : "w-64"}`}>
        <div className="mb-5 flex items-center justify-between gap-2 px-1">
          {!collapsed && <BrandLogo />}
          <button onClick={() => setCollapsed((v) => !v)} aria-label="Réduire la barre" className="rounded-md p-1.5 hover:bg-primary-foreground/10">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <NavList collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-primary text-primary-foreground p-4">
          <SheetTitle className="mb-4"><BrandLogo /></SheetTitle>
          <NavList onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-2 border-b-2 border-primary bg-card px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button className="md:hidden rounded-md p-2" aria-label="Menu" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <h1 className="truncate font-serif text-base sm:text-lg">Studio d'administration</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">SuperAdmin <ChevronDown className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}><User className="mr-2 h-4 w-4" />Mon compte</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app" })}><Eye className="mr-2 h-4 w-4" />Voir l'application</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
