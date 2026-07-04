import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WidgetRenderer } from "@/core/widgets";

export const Route = createFileRoute("/_authenticated/app/contacts/$contactId")({
  head: () => ({ meta: [{ title: "Contact — Kosy" }] }),
  component: ContactDetail,
});

function ContactDetail() {
  const { contactId } = useParams({ from: "/_authenticated/app/contacts/$contactId" });
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/contacts" })}>
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>

      {/*
        Aucun widget n'est codé en dur ici.
        Le WidgetRenderer interroge le Registry et instancie les widgets
        enregistrés sur la surface `contact.detail`.
      */}
      <WidgetRenderer surface="contact.detail" context={{ contactId }} />
    </div>
  );
}
