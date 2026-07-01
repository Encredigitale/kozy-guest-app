import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, Users, User, Plus } from "lucide-react";

const leftTabs = [
  { to: "/app", label: "Accueil", icon: Home, exact: true },
  { to: "/app/events", label: "Événements", icon: CalendarDays, exact: false },
] as const;

const rightTabs = [
  { to: "/app/contacts", label: "Contacts", icon: Users, exact: false },
  { to: "/app/profile", label: "Profil", icon: User, exact: false },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/app" className="font-serif text-2xl text-primary tracking-tight">
            Kosy
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 pb-32 animate-fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border/60 bg-background/95 backdrop-blur z-20">
        <div className="max-w-5xl mx-auto grid grid-cols-5 items-end">
          {leftTabs.map((t) => (
            <NavItem key={t.to} to={t.to} label={t.label} Icon={t.icon} active={isActive(t.to, t.exact)} />
          ))}
          <div className="flex justify-center -mt-6">
            <Link
              to="/app/events/new"
              aria-label="Créer un événement"
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>
          {rightTabs.map((t) => (
            <NavItem key={t.to} to={t.to} label={t.label} Icon={t.icon} active={isActive(t.to, t.exact)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
