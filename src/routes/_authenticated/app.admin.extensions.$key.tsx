import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { useExtensions, useExtensionSettings, findExtensionByKey } from "@/core/extensions";
import { SettingsForm } from "@/core/extensions/SettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/extensions/$key")({
  head: () => ({ meta: [{ title: "Paramètres extension — Admin" }] }),
  component: ExtensionSettingsPage,
});

function ExtensionSettingsPage() {
  const { key } = Route.useParams();
  const { isAdmin, loading } = useSession();
  const { data: rows, isLoading } = useExtensions();
  const [tab, setTab] = useState<"global" | "custom">("global");

  const def = findExtensionByKey(key);
  const row = rows?.find((r) => r.key === key);
  const settings = useExtensionSettings(key);

  if (loading || isLoading) return null;
  if (!isAdmin) return <Navigate to="/app" />;

  if (!row || !def) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <Link to="/app/admin/extensions" className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Retour
        </Link>
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">Extension introuvable.</CardContent>
        </Card>
      </div>
    );
  }

  const CustomComponent = def.settingsComponent;
  const schema = def.settingsSchema ?? [];

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <Link to="/app/admin/extensions" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{def.name}</h1>
        <p className="text-sm text-muted-foreground">Paramètres globaux (appliqués à tous les événements).</p>
      </div>

      <Card className="rounded-2xl border-border/60">
        {CustomComponent && schema.length > 0 ? (
          <>
            <CardHeader className="pb-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "global" | "custom")}>
                <TabsList>
                  <TabsTrigger value="global">Paramètres</TabsTrigger>
                  <TabsTrigger value="custom">Avancé</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {tab === "global" ? (
                <SettingsForm
                  schema={schema}
                  initialValues={settings.globalSettings}
                  submitting={settings.save.isPending}
                  onSubmit={(values) =>
                    settings.save.mutate(
                      { settings: values, scope: "global" },
                      { onSuccess: () => toast.success("Paramètres enregistrés") },
                    )
                  }
                />
              ) : (
                <CustomComponent />
              )}
            </CardContent>
          </>
        ) : CustomComponent ? (
          <>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Écran de configuration spécifique à cette extension.</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomComponent />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">Paramètres</CardTitle>
              <CardDescription>
                {schema.length === 0
                  ? "Cette extension n'expose aucun paramètre configurable."
                  : "Réglages globaux."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.isLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                </p>
              ) : (
                <SettingsForm
                  schema={schema}
                  initialValues={settings.globalSettings}
                  submitting={settings.save.isPending}
                  onSubmit={(values) =>
                    settings.save.mutate(
                      { settings: values, scope: "global" },
                      { onSuccess: () => toast.success("Paramètres enregistrés") },
                    )
                  }
                />
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
