import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Paramètres — Studio d'administration" }] }),
  component: () => (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl">Paramètres</h2>
      <p className="text-sm text-muted-foreground">Configuration générale de l'application.</p>
      <div className="flex flex-wrap gap-2"><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/menu-components">Composantes de repas</Link><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/contribution-types">Types d'apports</Link><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/screens">Écrans</Link><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/studio">Studio de widgets</Link><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/admin/registry">Registry</Link></div>
    </div>
  ),
});
