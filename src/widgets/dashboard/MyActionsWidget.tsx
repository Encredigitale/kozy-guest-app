import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Bell, Calendar } from "lucide-react";

const ACTIONS = [
  { to: "/app/events/new", label: "Nouvel événement", icon: Plus, color: "text-primary bg-primary/10" },
  { to: "/app/events", label: "Mes événements", icon: Calendar, color: "text-secondary bg-secondary/10" },
  { to: "/app/notifications", label: "Notifications", icon: Bell, color: "text-accent-foreground bg-accent/35" },
  { to: "/app/profile", label: "Mon profil", icon: Users, color: "text-secondary bg-secondary/10" },
] as const;

export default function MyActionsWidget() {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold mb-4">Mes actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACTIONS.map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent transition-colors text-center"
            >
              <div className={`h-10 w-10 rounded-full grid place-items-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
