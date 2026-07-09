import { createFileRoute } from "@tanstack/react-router";
import { AdminWidgetsWidget } from "@/widgets/admin-widgets/AdminWidgetsWidget";

export const Route = createFileRoute("/_authenticated/app/admin/widgets")({
  head: () => ({ meta: [{ title: "Studio des widgets — Kosy" }] }),
  component: () => (
    <div className="max-w-3xl">
      <AdminWidgetsWidget />
    </div>
  ),
});
