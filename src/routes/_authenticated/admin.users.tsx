import { createFileRoute } from "@tanstack/react-router";
import { AdminTablePage } from "@/core/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Utilisateurs — Studio d'administration" }] }),
  component: () => <AdminTablePage kind="users" title="Utilisateurs" intro="Comptes inscrits et leurs rôles." />,
});
