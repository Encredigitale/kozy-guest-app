import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, Bell, User } from "lucide-react";

const ACTIONS = [
  { to: "/app/events/new", label: "Nouvel événement", icon: Plus },
  { to: "/app/events", label: "Mes événements", icon: Calendar },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/profile", label: "Mon profil", icon: User },
] as const;

export default function QuickActionsWidget() {
  return (
    <Card className="rounded-2xl border-border/60 h-full">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Actions rapides</p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border/60 hover:bg-accent hover:border-primary/40 transition-colors"
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
