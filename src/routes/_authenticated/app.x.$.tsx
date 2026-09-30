import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveExtensions } from "@/core/extensions";

export const Route = createFileRoute("/_authenticated/app/x/$")({
  head: () => ({ meta: [{ title: "Extension — Ma Belle Table" }] }),
  component: ExtensionHost,
});

function ExtensionHost() {
  const { _splat } = Route.useParams();
  const path = (_splat ?? "").replace(/^\/+|\/+$/g, "");
  const [extKey, ...rest] = path.split("/");
  const screenPath = rest.join("/") || "";
  const { data: exts, isLoading } = useActiveExtensions();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  const ext = exts.find((e) => e.key === extKey);
  if (!ext) {
    return (
      <div className="p-8">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Extension introuvable ou désactivée.
          </CardContent>
        </Card>
      </div>
    );
  }

  const screen = (ext.screens ?? []).find((s) => s.path === screenPath) ?? ext.screens?.[0];
  if (!screen) {
    return (
      <div className="p-8">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Cette extension n'expose aucun écran.
          </CardContent>
        </Card>
      </div>
    );
  }

  const Screen = screen.component;
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'extension…
        </div>
      }
    >
      <Screen />
    </Suspense>
  );
}
