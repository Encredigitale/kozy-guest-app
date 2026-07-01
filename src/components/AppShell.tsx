import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, Sparkles, User } from "lucide-react";

const tabs = [
  { to: "/app", label: "Accueil", icon: Home, exact: true },
  { to: "/app/events", label: "Événements", icon: CalendarDays, exact: false },
  { to: "/app/memories", label: "Souvenirs", icon: Sparkles, exact: false },
  { to: "/app/profile", label: "Profil", icon: User, exact: false },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/app" className="font-serif text-2xl text-primary tracking-tight">
            Kosy
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 pb-28 animate-fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
