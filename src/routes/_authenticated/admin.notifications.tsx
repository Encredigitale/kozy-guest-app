import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Studio d'administration" }] }),
  component: () => (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl">Notifications</h2>
      <p className="text-sm text-muted-foreground">Rappels automatiques : e-mail la veille et notification le jour J à 8h (heure de Paris).</p>
      <div className="flex flex-wrap gap-2"><Link className="rounded-full border-2 border-primary bg-card px-4 py-2 text-sm" to="/app/notifications">Voir mes notifications</Link></div>
    </div>
  ),
});
