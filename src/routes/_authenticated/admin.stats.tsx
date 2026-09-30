import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/stats")({
  head: () => ({ meta: [{ title: "Statistiques — Studio d'administration" }] }),
  component: () => (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl">Statistiques</h2>
      <p className="text-sm text-muted-foreground">Indicateurs d'utilisation.</p>
      <div className="flex flex-wrap gap-2"><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/admin/dashboard">Indicateurs clés</Link><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/search">Recherche</Link></div>
    </div>
  ),
});
