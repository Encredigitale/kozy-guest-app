import { createFileRoute } from "@tanstack/react-router";
import { AdminTablePage } from "@/core/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Événements — Studio d'administration" }] }),
  component: () => <AdminTablePage kind="events" title="Événements" intro="Tous les événements créés." />,
});
