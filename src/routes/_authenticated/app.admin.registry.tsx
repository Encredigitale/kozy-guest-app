import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWidgets, widgetsQueryOptions } from "@/core/registry/useRegistry";
import { listRegisteredComponentKeys } from "@/core/registry/components";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { WidgetManifest, WidgetRow } from "@/core/registry/types";

export const Route = createFileRoute("/_authenticated/app/admin/registry")({
  head: () => ({ meta: [{ title: "Registry — Ma Belle Table" }] }),
  component: RegistryPage,
});

function RegistryPage() {
  const { isAdmin, loading: sessionLoading } = useSession();
  const { data: widgets, isLoading } = useWidgets();
  const qc = useQueryClient();
  const registeredKeys = useMemo(() => listRegisteredComponentKeys(), []);

  const refresh = () => qc.invalidateQueries({ queryKey: widgetsQueryOptions.queryKey });

  const toggle = async (w: WidgetRow, next: boolean) => {
    const { error } = await supabase.from("widgets").update({ enabled: next }).eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Widget activé." : "Widget désactivé.");
    refresh();
  };

  const remove = async (w: WidgetRow) => {
    if (w.manifest?.required) return toast.error("Widget obligatoire — suppression interdite.");
    if (!confirm("Supprimer ce widget du registry ?")) return;
    const { error } = await supabase.from("widgets").delete().eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success("Widget supprimé.");
    refresh();
  };


  if (sessionLoading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8">
        <p className="text-sm text-destructive">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-primary">Widget Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manifests stockés en base. Activation à chaud sans redéploiement.
          </p>
        </div>
        <WidgetDialog onSaved={refresh} registeredKeys={registeredKeys}>
          <Button className="rounded-full"><Plus className="h-4 w-4" /> Nouveau widget</Button>
        </WidgetDialog>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (widgets ?? []).length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Aucun widget déclaré. Créez le premier avec le bouton ci-dessus.
            </CardContent>
          </Card>
        ) : (
          (widgets ?? []).map((w) => (
            <Card key={w.id} className="rounded-2xl border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {w.name}
                      <span className="text-xs font-normal text-muted-foreground">v{w.version}</span>
                    </CardTitle>
                    <CardDescription>{w.description ?? "—"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={w.enabled}
                      disabled={!!w.manifest?.required}
                      onCheckedChange={(v) => toggle(w, v)}
                    />
                    <WidgetDialog widget={w} onSaved={refresh} registeredKeys={registeredKeys}>
                      <Button variant="outline" size="sm" className="rounded-full">Éditer</Button>
                    </WidgetDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!!w.manifest?.required}
                      onClick={() => remove(w)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Meta label="ID" value={w.id} />
                  <Meta label="Composant" value={w.manifest?.component ?? "—"} />
                  <Meta label="Surface" value={w.manifest?.surface ?? "—"} />
                  <Meta label="Ordre" value={String(w.manifest?.order ?? 0)} />
                  <Meta label="Catégorie" value={w.category ?? "—"} />
                  <Meta label="Path" value={w.manifest?.path ?? "—"} />
                  <Meta label="Types" value={(w.manifest?.eventTypes ?? []).join(", ") || "tous"} />
                  <Meta label="Obligatoire" value={w.manifest?.required ? "oui" : "non"} />

                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <PreviewPanel widgets={widgets ?? []} />
    </div>
  );
}

function PreviewPanel({ widgets }: { widgets: WidgetRow[] }) {
  const surfaces = useMemo(() => {
    const s = new Set<string>();
    widgets.forEach((w) => { if (w.manifest?.surface) s.add(w.manifest.surface); });
    return Array.from(s).sort();
  }, [widgets]);
  const [surface, setSurface] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");

  const activeSurface = surface || surfaces[0] || "";

  const simulate = (role: "organizer" | "guest" | "admin") => {
    const isAdmin = role === "admin";
    const contextualRoles = role === "admin" ? [] : [role];
    const held = new Set<string>([...(isAdmin ? ["admin"] : []), ...contextualRoles]);
    const enabledIds = new Set(widgets.filter((w) => w.enabled).map((w) => w.id));
    return widgets
      .filter((w) => w.enabled)
      .filter((w) => w.manifest?.surface === activeSurface)
      .filter((w) => w.manifest?.visible !== false)
      .filter((w) => {
        const types = w.manifest?.eventTypes ?? [];
        if (types.length === 0) return true;
        return eventType ? types.includes(eventType) : false;
      })
      .filter((w) => {
        const perms = w.manifest?.permissions ?? [];
        if (perms.length === 0) return true;
        if (isAdmin) return true;
        return perms.some((p) => held.has(p));
      })
      .filter((w) => (w.manifest?.dependencies ?? []).every((d) => enabledIds.has(d)))
      .sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
  };

  const roles: Array<{ key: "organizer" | "guest" | "admin"; label: string; hint: string }> = [
    { key: "organizer", label: "Organisateur", hint: "Rôle contextuel : organizer" },
    { key: "guest", label: "Invité", hint: "Rôle contextuel : guest" },
    { key: "admin", label: "Admin", hint: "Super-rôle applicatif" },
  ];

  return (
    <div className="mt-12">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-primary">Prévisualisation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Simule l'affichage d'une surface selon le rôle contextuel de l'utilisateur.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Surface</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={activeSurface}
              onChange={(e) => setSurface(e.target.value)}
            >
              {surfaces.length === 0 && <option value="">—</option>}
              {surfaces.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type d'événement (optionnel)</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="ex. dinner"
              className="h-9 w-48"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map(({ key, label, hint }) => {
          const list = simulate(key);
          return (
            <Card key={key} className="rounded-2xl border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription className="text-xs">{hint}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun widget visible.</p>
                ) : (
                  list.map((w) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-lg border border-border/60 bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{w.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          #{w.manifest?.order ?? 0}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {w.manifest?.component}
                      </p>
                      {(w.manifest?.permissions ?? []).length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          perms : {(w.manifest?.permissions ?? []).join(", ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono truncate">{value}</p>
    </div>
  );
}

function WidgetDialog({
  children,
  widget,
  onSaved,
  registeredKeys,
}: {
  children: React.ReactNode;
  widget?: WidgetRow;
  onSaved: () => void;
  registeredKeys: string[];
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(widget?.id ?? "");
  const [name, setName] = useState(widget?.name ?? "");
  const [description, setDescription] = useState(widget?.description ?? "");
  const [version, setVersion] = useState(widget?.version ?? "1.0.0");
  const [category, setCategory] = useState(widget?.category ?? "");
  const [manifestJson, setManifestJson] = useState(
    JSON.stringify(
      widget?.manifest ?? {
        component: registeredKeys[0] ?? "hello-world",
        surface: "",
        order: 0,
        required: false,
        visible: true,
        eventTypes: [],
        permissions: [],
        dependencies: [],
        path: "hello",
        menu: { label: "Hello", icon: "Sparkles" },
      },

      null,
      2,
    ),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    let manifest: WidgetManifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch {
      return toast.error("Manifest JSON invalide.");
    }
    if (!manifest.component) return toast.error("manifest.component est requis.");
    if (!registeredKeys.includes(manifest.component)) {
      return toast.error(`Composant '${manifest.component}' non enregistré côté code. Clés : ${registeredKeys.join(", ")}`);
    }
    setSaving(true);
    const payload = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim() || null,
      version: version.trim() || "1.0.0",
      category: category.trim() || null,
      manifest: manifest as unknown as import("@/integrations/supabase/types").Json,
    };
    const { error } = widget
      ? await supabase.from("widgets").update(payload).eq("id", widget.id)
      : await supabase.from("widgets").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Widget enregistré.");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{widget ? "Éditer le widget" : "Nouveau widget"}</DialogTitle>
          <DialogDescription>
            Composants enregistrés côté code : <span className="font-mono">{registeredKeys.join(", ") || "—"}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>ID</Label>
              <Input value={id} onChange={(e) => setId(e.target.value)} disabled={!!widget} placeholder="hello" />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Général" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Manifest (JSON)</Label>
            <Textarea
              value={manifestJson}
              onChange={(e) => setManifestJson(e.target.value)}
              className="font-mono text-xs h-48"
            />
            <p className="text-xs text-muted-foreground">
              Clés : <code>component</code>, <code>surface</code>, <code>order</code>,{" "}
              <code>required</code>, <code>visible</code>, <code>eventTypes</code>[],{" "}
              <code>permissions</code>[], <code>dependencies</code>[], <code>path</code>,{" "}
              <code>menu</code> {"{ label, icon, order }"}, <code>config</code> {"{ ... }"}.
            </p>
            <p className="text-xs text-muted-foreground">
              Jetons <code>permissions</code> (OR — au moins un requis) :{" "}
              <code>admin</code>, <code>organizer</code>, <code>guest</code>, ou un rôle
              applicatif personnalisé. Vide = visible par tous. <code>admin</code> voit tout.
            </p>


          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving || !id || !name} className="rounded-full">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
