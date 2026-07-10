import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Puzzle, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Framework" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isAdmin } = useSession();
  const { data: active } = useActiveWidgets();

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl tracking-tight text-primary">Bonjour</h1>
      <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard icon={User} label="Rôle" value={isAdmin ? "Administrateur" : "Utilisateur"} />
        <StatCard icon={Puzzle} label="Widgets actifs" value={String(active.length)} />
        <StatCard icon={ShieldCheck} label="Session" value="Sécurisée" />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium">Widgets disponibles</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun widget activé. {isAdmin ? "Rendez-vous dans le Registry pour en activer." : ""}
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {active.map((w) => (
              <Card key={w.id} className="rounded-2xl border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <CardDescription>{w.description ?? "—"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    v{w.version} · {w.category ?? "sans catégorie"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
