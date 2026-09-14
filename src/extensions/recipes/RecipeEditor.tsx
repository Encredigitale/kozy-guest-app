import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlignLeft,
  Bold,
  Camera,
  Link2,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import { normalizeRecipeUrl, type RecipesConfig } from "./config";
import { useRecipeMutations } from "./useRecipes";
import { uploadRecipePhoto, type PendingPhoto } from "./upload";
import type { RecipeDetail } from "./public-types";

type Format = "text" | "photos" | "link";

/**
 * Écran d'ajout unique : les trois formats se combinent librement,
 * aucun choix n'est définitif. L'enregistrement s'active dès qu'un contenu existe.
 */
export function RecipeEditor({
  eventId,
  menuItemId,
  menuItemLabel,
  recipe,
  config,
  open,
  onOpenChange,
  onSaved,
}: {
  eventId: string;
  menuItemId: string;
  menuItemLabel: string;
  recipe: RecipeDetail | null;
  config: RecipesConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (recipeId: string) => void;
}) {
  const { save } = useRecipeMutations(eventId);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(recipe?.title ?? menuItemLabel);
  const [editTitle, setEditTitle] = useState(false);
  const [text, setText] = useState(recipe?.textContent ?? "");
  const [url, setUrl] = useState(recipe?.externalUrl ?? "");
  const [note, setNote] = useState(recipe?.externalUrlNote ?? "");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<Format[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(recipe?.title ?? menuItemLabel);
    setEditTitle(false);
    setText(recipe?.textContent ?? "");
    setUrl(recipe?.externalUrl ?? "");
    setNote(recipe?.externalUrlNote ?? "");
    setPhotos(
      (recipe?.photos ?? [])
        .filter((p) => p.url)
        .map((p) => ({ path: p.path, width: 0, height: 0, preview: p.url! })),
    );
    const initial: Format[] = [];
    if (recipe?.textContent) initial.push("text");
    if ((recipe?.photos ?? []).length > 0) initial.push("photos");
    if (recipe?.externalUrl) initial.push("link");
    setActive(initial);
  }, [open, recipe, menuItemLabel]);

  const allFormats: Array<{ key: Format; label: string; hint: string; icon: typeof AlignLeft }> = [
    { key: "text", label: "Écrire", hint: "Texte libre", icon: AlignLeft },
    { key: "photos", label: "Photos", hint: `Jusqu'à ${config.maxPhotos}`, icon: Camera },
    { key: "link", label: "Lien web", hint: "Adresse d'une page", icon: Link2 },
  ];
  const available = allFormats.filter(
    (f) =>
      (f.key === "text" && config.allowText) ||
      (f.key === "photos" && config.allowPhotos) ||
      (f.key === "link" && config.allowLink),
  );

  const missing = available.filter((f) => !active.includes(f.key));

  const wrapSelection = (before: string, after = before) => {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${text.slice(0, start)}${before}${text.slice(start, end)}${after}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = config.maxPhotos - photos.length;
    if (room <= 0) {
      toast.error(`${config.maxPhotos} photos maximum.`);
      return;
    }
    setUploading(true);
    try {
      const next: PendingPhoto[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        next.push(await uploadRecipePhoto(eventId, file, config));
      }
      setPhotos((prev) => [...prev, ...next]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo impossible à ajouter.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const swapPhotos = () => setPhotos((prev) => (prev.length === 2 ? [prev[1]!, prev[0]!] : prev));

  const cleanUrl = url.trim() ? normalizeRecipeUrl(url) : null;
  const hasContent =
    text.trim().length > 0 || photos.length > 0 || (url.trim().length > 0 && !!cleanUrl);

  const submit = () => {
    if (url.trim() && !cleanUrl) {
      toast.error("Adresse web non valide.");
      return;
    }
    save.mutate(
      {
        menuItemId,
        recipeId: recipe?.id ?? null,
        title: title.trim() || menuItemLabel,
        textContent: text,
        externalUrl: url,
        externalUrlNote: note,
        photos: photos.map((p) => ({
          path: p.path,
          width: p.width,
          height: p.height,
        })),
      },
      {
        onSuccess: (recipeId) => {
          toast.success(recipe ? "Recette mise à jour." : "Recette ajoutée.");
          onOpenChange(false);
          onSaved?.(recipeId);
        },
        onError: () => toast.error("Enregistrement impossible."),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>{recipe ? "Modifier la recette" : "Ajouter une recette"}</SheetTitle>
          <SheetDescription>
            Ajoutez ce que vous voulez : du texte, des photos, un lien — ou tout à la fois.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Titre repris de l'élément du menu */}
          <div className="space-y-1.5">
            {editTitle ? (
              <>
                <Label htmlFor="recipe-title">Titre</Label>
                <Input
                  id="recipe-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-base font-medium">{title}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setEditTitle(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Modifier le titre
                </Button>
              </div>
            )}
          </div>

          {/* Formats disponibles, sous forme de petites cartes */}
          {active.length === 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {available.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActive([f.key])}
                  className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-center transition hover:bg-muted"
                >
                  <f.icon className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                  <p className="text-xs font-medium">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                </button>
              ))}
            </div>
          ) : null}

          {active.includes("text") && (
            <div className="space-y-2">
              <Label htmlFor="recipe-text">Recette écrite</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => wrapSelection("**")}
                  aria-label="Gras"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => wrapSelection("\n- ", "")}
                  aria-label="Liste"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                id="recipe-text"
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Écrivez votre recette, vos ingrédients, vos étapes de préparation ou simplement vos notes…"
              />
            </div>
          )}

          {active.includes("photos") && (
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, i) => (
                  <div key={`${p.preview}-${i}`} className="relative overflow-hidden rounded-xl border border-border/60">
                    <img src={p.preview} alt="" className="h-32 w-full object-cover" />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full"
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Supprimer la photo"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={uploading || photos.length >= config.maxPhotos}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-1 h-4 w-4" />
                  )}
                  {photos.length === 0 ? "Prendre ou choisir une photo" : "Ajouter une photo"}
                </Button>
                {photos.length === 2 && (
                  <Button type="button" variant="ghost" className="rounded-full" onClick={swapPhotos}>
                    <ArrowLeftRight className="mr-1 h-4 w-4" />
                    Changer l'ordre
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => void addPhotos(e.target.files)}
              />
            </div>
          )}

          {active.includes("link") && (
            <div className="space-y-2">
              <Label htmlFor="recipe-url">Lien web</Label>
              <Input
                id="recipe-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              {url.trim() && !cleanUrl && (
                <p className="text-xs text-destructive">Adresse non valide.</p>
              )}
              <Label htmlFor="recipe-note">Ma note (facultatif)</Label>
              <Input
                id="recipe-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex. Doubler la quantité de crème"
              />
            </div>
          )}

          {active.length > 0 && missing.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {missing.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setActive((prev) => [...prev, f.key])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {f.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pb-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-full"
            onClick={submit}
            disabled={!hasContent || save.isPending || uploading}
          >
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
