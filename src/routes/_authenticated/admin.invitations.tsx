import { createFileRoute } from "@tanstack/react-router";
import { AdminTablePage } from "@/core/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/invitations")({
  head: () => ({ meta: [{ title: "Invitations — Studio d'administration" }] }),
  component: () => <AdminTablePage kind="invitations" title="Invitations" intro="Vue globale des invitations." />,
});
