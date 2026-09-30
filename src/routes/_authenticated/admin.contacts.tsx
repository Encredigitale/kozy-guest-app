import { createFileRoute } from "@tanstack/react-router";
import { AdminTablePage } from "@/core/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Studio d'administration" }] }),
  component: () => <AdminTablePage kind="contacts" title="Contacts" intro="Supervision agrégée : le contenu des carnets reste privé." />,
});
