import { createFileRoute } from "@tanstack/react-router";
import { WidgetRenderer } from "@/core/widgets";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Accueil — Kosy" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  // La surface `dashboard` est entièrement pilotée par le Registry.
  return (
    <WidgetRenderer
      surface="dashboard"
      context={{ userId: user.id, userEmail: user.email ?? "" }}
      className="space-y-6"
    />
  );
}
