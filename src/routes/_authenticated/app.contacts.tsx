import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { resolveWidgetComponent } from "@/core/registry/components";

export const Route = createFileRoute("/_authenticated/app/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — Kozy" },
      { name: "description", content: "Votre carnet d'adresses personnel." },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const Widget = resolveWidgetComponent("contacts.book");
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-primary">Contacts</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Vos contacts favoris et réutilisables pour vos prochains événements.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        {Widget ? <Widget /> : <p className="text-sm text-muted-foreground">Widget indisponible.</p>}
      </Suspense>
    </div>
  );
}
