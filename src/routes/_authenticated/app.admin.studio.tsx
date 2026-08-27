import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWidgets, widgetsQueryOptions } from "@/core/registry/useRegistry";
import { listRegisteredComponentKeys } from "@/core/registry/components";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, ArrowUp, ArrowDown, Send, FileEdit } from "lucide-react";
import type { WidgetManifest, WidgetRow, WidgetSize, WidgetStatus } from "@/core/registry/types";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";

export const Route = createFileRoute("/_authenticated/app/admin/studio")({
  head: () => ({ meta: [{ title: "Studio — Kozy" }] }),
  component: StudioPage,
});

const SURFACES = ["dashboard", "event.detail", "event.new", "menu", "profile"];
const SIZES: WidgetSize[] = ["sm", "md", "lg", "full"];
const ROLES = ["admin", "organizer", "guest"];

function StudioPage() {
  const { isAdmin, loading } = useSession();
  const { data: widgets = [], isLoading } = useWidgets();
  const qc = useQueryClient();
  const registered = useMemo(() => listRegisteredComponentKeys(), []);

  const [surface, setSurface] = useState<string>("dashboard");
  const [previewRole, setPreviewRole] = useState<"admin" | "organizer" | "guest">("admin");
  const [eventType, setEventType] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: widgetsQueryOptions.queryKey });

  const list = useMemo(() => {
    return widgets
      .filter((w) => w.manifest?.surface === surface)
      .sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
  }, [widgets, surface]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  const move = async (w: WidgetRow, dir: -1 | 1) => {
    const idx = list.findIndex((x) => x.id === w.id);
    const other = list[idx + dir];
    if (!other) return;
    const a = { ...(w.manifest ?? {}), order: other.manifest?.order ?? 0 };
    const b = { ...(other.manifest ?? {}), order: w.manifest?.order ?? 0 };
    await supabase.from("widgets").update({ manifest: a as never }).eq("id", w.id);
    await supabase.from("widgets").update({ manifest: b as never }).eq("id", other.id);
    refresh();
  };

  const setStatus = async (w: WidgetRow, status: WidgetStatus) => {
    const { error } = await supabase.from("widgets").update({ status }).eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Widget publié." : "Widget mis en brouillon.");
    refresh();
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-primary">Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilotez toutes les surfaces (dashboard, événement, wizard…) sans toucher au code.
          </p>
          <Link to="/app/admin/registry" className="text-xs text-primary hover:underline">
            → Voir le Registry brut
          </Link>
        </div>
        <WidgetEditor registered={registered} onSaved={refresh} defaultSurface={surface}>
          <Button className="rounded-full"><Plus className="h-4 w-4" /> Nouveau widget</Button>
        </WidgetEditor>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Surfaces</p>
          {SURFACES.map((s) => (
            <button
              key={s}
              onClick={() => setSurface(s)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${surface === s ? "bg-accent" : "hover:bg-accent/60 text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </aside>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : list.length === 0 ? (
            <Card className="rounded-2xl border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">Aucun widget sur cette surface.</CardContent></Card>
          ) : (
            list.map((w, i) => (
              <Card key={w.id} className="rounded-2xl border-border/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button className="p-1 rounded hover:bg-accent disabled:opacity-30" disabled={i === 0} onClick={() => move(w, -1)}><ArrowUp className="h-3 w-3" /></button>
                    <button className="p-1 rounded hover:bg-accent disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(w, 1)}><ArrowDown className="h-3 w-3" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <Badge variant={w.status === "published" ? "default" : "secondary"} className="text-[10px]">
                        {w.status === "published" ? "Publié" : "Brouillon"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">size: {w.size ?? "full"}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{w.manifest?.component}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{w.description ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={w.enabled} onCheckedChange={async (v) => { await supabase.from("widgets").update({ enabled: v }).eq("id", w.id); refresh(); }} />
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setStatus(w, w.status === "published" ? "draft" : "published")}>
                      {w.status === "published" ? <FileEdit className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                    <WidgetEditor widget={w} registered={registered} onSaved={refresh} defaultSurface={surface}>
                      <Button variant="outline" size="sm" className="rounded-full">Éditer</Button>
                    </WidgetEditor>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-primary flex items-center gap-2"><Eye className="h-5 w-5" /> Prévisualisation</h2>
            <p className="text-sm text-muted-foreground mt-1">Rendu de la surface <span className="font-mono">{surface}</span> selon le rôle.</p>
          </div>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Rôle</Label>
              <Select value={previewRole} onValueChange={(v) => setPreviewRole(v as never)}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {surface === "event.detail" && (
              <div className="space-y-1">
                <Label className="text-xs">Type d'événement</Label>
                <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="dinner" className="h-9 w-40" />
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 border border-border/60 rounded-2xl p-6 bg-muted/20">
          <WidgetRenderer
            surface={surface}
            eventType={eventType || undefined}
            contextualRoles={previewRole === "admin" ? [] : [previewRole]}
            includeDrafts
            fallback={<p className="text-sm text-muted-foreground italic">Rien à afficher pour ce rôle.</p>}
          />
        </div>
      </div>
    </div>
  );
}

function WidgetEditor({
  children, widget, registered, onSaved, defaultSurface,
}: {
  children: React.ReactNode;
  widget?: WidgetRow;
  registered: string[];
  onSaved: () => void;
  defaultSurface: string;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(widget?.id ?? "");
  const [name, setName] = useState(widget?.name ?? "");
  const [description, setDescription] = useState(widget?.description ?? "");
  const [version, setVersion] = useState(widget?.version ?? "1.0.0");
  const [category, setCategory] = useState(widget?.category ?? "");
  const [component, setComponent] = useState(widget?.manifest?.component ?? registered[0] ?? "");
  const [surface, setSurface] = useState(widget?.manifest?.surface ?? defaultSurface);
  const [order, setOrder] = useState<number>(widget?.manifest?.order ?? 0);
  const [size, setSize] = useState<WidgetSize>((widget?.size as WidgetSize) ?? "full");
  const [status, setStatus] = useState<WidgetStatus>((widget?.status as WidgetStatus) ?? "draft");
  const [permissions, setPermissions] = useState<string>((widget?.manifest?.permissions ?? []).join(","));
  const [eventTypes, setEventTypes] = useState<string>((widget?.manifest?.eventTypes ?? []).join(","));
  const [required, setRequired] = useState<boolean>(!!widget?.manifest?.required);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!id.trim() || !name.trim() || !component) return toast.error("ID, nom et composant requis.");
    if (!registered.includes(component)) return toast.error(`Composant non enregistré. Disponibles : ${registered.join(", ")}`);
    setSaving(true);
    const manifest: WidgetManifest = {
      component,
      surface: surface || undefined,
      order,
      required,
      visible: true,
      permissions: permissions.split(",").map((s) => s.trim()).filter(Boolean),
      eventTypes: eventTypes.split(",").map((s) => s.trim()).filter(Boolean),
      dependencies: widget?.manifest?.dependencies ?? [],
      menu: widget?.manifest?.menu,
      path: widget?.manifest?.path,
      config: widget?.manifest?.config,
    };
    const payload = {
      id: id.trim(), name: name.trim(),
      description: description.trim() || null,
      version: version.trim() || "1.0.0",
      category: category.trim() || null,
      manifest: manifest as never,
      size, status,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{widget ? "Éditer" : "Nouveau widget"}</DialogTitle>
          <DialogDescription>Configuration structurée — plus besoin de JSON brut.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>ID</Label><Input value={id} onChange={(e) => setId(e.target.value)} disabled={!!widget} /></div>
            <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} /></div>
            <div className="space-y-2"><Label>Catégorie</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Composant</Label>
              <Select value={component} onValueChange={setComponent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{registered.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Surface</Label>
              <Select value={surface} onValueChange={setSurface}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SURFACES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taille</Label>
              <Select value={size} onValueChange={(v) => setSize(v as WidgetSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WidgetStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Ordre</Label><Input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2 flex items-center gap-2 pt-6"><Switch checked={required} onCheckedChange={setRequired} /><Label>Obligatoire</Label></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Permissions (rôles, séparés par virgule)</Label>
              <Input value={permissions} onChange={(e) => setPermissions(e.target.value)} placeholder="organizer,guest" />
              <p className="text-[11px] text-muted-foreground">Vide = tous. admin voit tout.</p>
            </div>
            <div className="space-y-2">
              <Label>Types d'événement (séparés par virgule)</Label>
              <Input value={eventTypes} onChange={(e) => setEventTypes(e.target.value)} placeholder="dinner,party" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
