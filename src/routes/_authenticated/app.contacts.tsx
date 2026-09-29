import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { BookUser } from "lucide-react";
import { resolveWidgetComponent } from "@/core/registry/components";

export const Route = createFileRoute("/_authenticated/app/contacts")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contacts — Kozy" },
      { name: "description", content: "Votre carnet d'adresses personnel." },
      { property: "og:title", content: "Contacts — Kozy" },
      { property: "og:description", content: "Votre carnet d'adresses personnel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const Widget = resolveWidgetComponent("contacts.book");
  return (
    <div className="kozy-page max-w-3xl">
      <header className="kozy-title-band mb-8 p-5 md:p-6">
        <h1 className="font-serif text-3xl md:text-4xl text-primary flex items-center gap-2">
          <BookUser className="h-7 w-7" /> Contacts
        </h1>
        <p className="text-sm text-foreground/70 mt-2">
          Vos contacts favoris et réutilisables pour vos prochains événements.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        {Widget ? <Widget /> : <p className="text-sm text-muted-foreground">Widget indisponible.</p>}
      </Suspense>
    </div>
  );
}
