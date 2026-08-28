import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DOC_LABELS, type LegalDocType } from "@/extensions/user-info/types";

const TYPES: LegalDocType[] = ["terms", "privacy"];

export const Route = createFileRoute("/legal/$docType")({
  beforeLoad: ({ params }) => {
    if (!TYPES.includes(params.docType as LegalDocType)) throw notFound();
  },
  head: ({ params }) => {
    const label = DOC_LABELS[params.docType as LegalDocType] ?? "Document légal";
    const title = `${label} — Kozy`;
    const description = `${label} de Kozy, l'application qui aide à organiser les moments entre proches.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: LegalPage,
  errorComponent: () => (
    <Fallback message="Ce document n'a pas pu être chargé pour le moment." />
  ),
  notFoundComponent: () => <Fallback message="Ce document est introuvable." />,
});

function Fallback({ message }: { message: string }) {
  return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild className="rounded-full">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </main>
  );
}

function LegalPage() {
  const { docType } = Route.useParams();
  const label = DOC_LABELS[docType as LegalDocType] ?? "Document légal";

  const { data, isLoading } = useQuery({
    queryKey: ["legal_document", docType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("version, content, published_at")
        .eq("doc_type", docType)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2 mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Link>
        </Button>
        <h1 className="font-serif text-4xl tracking-tight text-primary">{label}</h1>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Version {data.version}
            {data.published_at
              ? ` · publiée le ${new Date(data.published_at).toLocaleDateString("fr-FR")}`
              : ""}
          </p>
        )}
        <div className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground italic">
              Ce document n'est pas encore publié.
            </p>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {data.content}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
