import { createFileRoute } from "@tanstack/react-router";
import { AdminTablePage } from "@/core/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Journal système — Studio d'administration" }] }),
  component: () => <AdminTablePage kind="audit" title="Journal système" intro="Actions administratives tracées." />,
});
