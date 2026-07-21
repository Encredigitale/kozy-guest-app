import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Loader2, Upload, Link as LinkIcon, Info } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { extensionManifestSchema, findExtensionByKey } from "@/core/extensions";
import { checkExtensionCompatibility } from "@/core/version";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/extensions/install")({
  head: () => ({ meta: [{ title: "Installer une extension — Admin" }] }),
  component: InstallExtensionPage,
});

function InstallExtensionPage() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"json" | "url">("json");
  const [jsonText, setJsonText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/app" />;

  const doInstall = async () => {
    setError(null);
    setBusy(true);
    try {
      let raw: unknown;
      if (mode === "json") {
        try {
          raw = JSON.parse(jsonText);
        } catch {
          throw new Error("JSON invalide.");
        }
      } else {
        if (!url.match(/^https?:\/\//)) throw new Error("URL invalide (http/https requis).");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Téléchargement échoué (${res.status}).`);
        raw = await res.json();
      }

      const parsed = extensionManifestSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          "Manifest invalide : " + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "),
        );
      }
      const m = parsed.data;

      const compat = checkExtensionCompatibility({
        min_core_version: m.min_core_version,
        min_db_version: m.min_db_version,
      });
      if (!compat.ok) throw new Error(compat.reason);

      const codeAvailable = !!findExtensionByKey(m.key);

      const { error: dbError } = await supabase.from("extensions").upsert(
        {
          key: m.key,
          name: m.name,
          description: m.description ?? null,
          category: m.category ?? null,
          version: m.version,
          min_core_version: m.min_core_version ?? "0.0.0",
          min_db_version: m.min_db_version ?? 1,
          scope: m.scope ?? "global",
          enabled: false, // never auto-enable on install
          manifest: m as never,
          installed_from: mode === "url" ? url : "manifest",
        },
        { onConflict: "key" },
      );
      if (dbError) throw dbError;

      toast.success(
        codeAvailable
          ? `Extension ${m.name} installée. Activez-la depuis la liste.`
          : `Manifest ${m.name} enregistré. Le code doit être fourni dans le build pour activation.`,
        { duration: 6000 },
      );
      navigate({ to: "/app/admin/extensions" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <Link to="/app/admin/extensions" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>
      <div>
        <h1 className="font-serif text-3xl">Installer une extension</h1>
        <p className="text-sm text-muted-foreground">Importez un manifest JSON pour enregistrer une extension.</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Le manifest décrit les métadonnées et capacités déclarées. Le <strong>code</strong> des widgets et écrans
          doit être fourni via le build (dossier <code>src/extensions/&lt;key&gt;/</code>). Sans code correspondant,
          l'extension apparaît avec le badge <em>Code manquant</em> et ne peut pas être activée.
        </AlertDescription>
      </Alert>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex gap-2">
            <Button
              variant={mode === "json" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("json")}
              className="rounded-full"
            >
              <Upload className="h-3.5 w-3.5" /> Coller JSON
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
              className="rounded-full"
            >
              <LinkIcon className="h-3.5 w-3.5" /> Depuis une URL
            </Button>
          </div>
          <CardTitle className="sr-only">Manifest</CardTitle>
          <CardDescription className="text-xs">
            Format : <code>key</code>, <code>name</code>, <code>version</code>, <code>min_core_version</code>,{" "}
            <code>min_db_version</code>, <code>widgets</code>, <code>screens</code>, <code>menu</code>,{" "}
            <code>settingsSchema</code>, <code>scope</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "json" ? (
            <Textarea
              placeholder={SAMPLE_MANIFEST}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="min-h-[280px] font-mono text-xs"
            />
          ) : (
            <Input
              placeholder="https://example.com/manifest.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={doInstall} disabled={busy} className="rounded-full">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Installer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SAMPLE_MANIFEST = `{
  "key": "my-plugin",
  "name": "Mon plugin",
  "description": "Exemple",
  "version": "1.0.0",
  "min_core_version": "1.0.0",
  "min_db_version": 1,
  "scope": "both",
  "widgets": [{ "key": "ext.my-plugin" }],
  "screens": [{ "path": "home", "label": "Accueil" }],
  "menu": [{ "label": "Mon plugin", "path": "home", "order": 100 }],
  "settingsSchema": [
    { "key": "apiKey", "label": "Clé API", "type": "text" }
  ]
}`;
