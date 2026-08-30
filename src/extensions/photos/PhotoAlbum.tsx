import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  Camera,
  Check,
  Eye,
  EyeOff,
  Flag,
  ImagePlus,
  Loader2,
  Pause,
  Settings2,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import type { PhotoAccess, PhotoAuth, PhotoItem } from "./public-types";
import {
  useEventPhotos,
  usePhotoActions,
  usePhotoReports,
  usePhotoUploader,
  useResolveReport,
} from "./usePhotos";
import PhotoLightbox from "./PhotoLightbox";
import CoverCropDialog from "./CoverCropDialog";
import { REPORT_REASONS } from "./config";

const CONSENT_KEY = "kozy.photos.consent";

export default function PhotoAlbum({
  eventId,
  access,
  auth,
}: {
  eventId: string;
  access: PhotoAccess;
  auth?: PhotoAuth;
}) {
  const { photos, total, loading, done, loadMore, reload } = useEventPhotos(eventId, auth, access.canView);
  const actions = usePhotoActions(eventId, auth);
  const { queue, enqueue, retry, dismiss, clearDone } = usePhotoUploader(eventId, auth, access, reload);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<PhotoItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [consent, setConsent] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const reports = usePhotoReports(eventId, auth, access.canModerate && showReports);
  const resolveReport = useResolveReport(eventId, auth);

  const [settings, setSettings] = useState({
    viewAudience: access.viewAudience as "organizer" | "confirmed" | "all",
    uploadAudience: access.uploadAudience as "organizer" | "confirmed",
    collaborative: access.collaborative,
  });

  useEffect(() => {
    if (typeof window !== "undefined") setConsent(window.localStorage.getItem(CONSENT_KEY) === "1");
  }, []);

  // Chargement progressif (infinite scroll contrôlé).
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done, photos.length]);

  const pendingUploads = useMemo(() => queue.filter((q) => q.status !== "done"), [queue]);
  const remaining = Math.max(0, access.maxPerEvent - total);

  const pick = (files: FileList | null, ref: React.RefObject<HTMLInputElement | null>) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, access.maxPerUpload);
    if (list.length > remaining) {
      toast.error(`Quota atteint : ${remaining} photo(s) encore possible(s).`);
      return;
    }
    enqueue(list);
    if (ref.current) ref.current.value = "";
  };

  const acceptConsent = () => {
    window.localStorage.setItem(CONSENT_KEY, "1");
    setConsent(true);
  };

  return (
    <div className="space-y-4">
      {access.enabled && !access.eventPassed && !access.isOrganizer && (
        <p className="text-xs text-muted-foreground italic rounded-2xl border border-border/60 bg-muted/40 p-3">
          L'album s'ouvrira après l'événement : vous pourrez ajouter vos photos une fois la date passée.
        </p>
      )}
      {access.canUpload && !consent && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-medium">Respect de la vie privée</p>
          <p className="text-xs text-muted-foreground">
            En ajoutant des photos, vous vous engagez à respecter la vie privée et le droit à l'image des
            personnes photographiées. Les albums sont privés et réservés aux participants autorisés.
          </p>
          <Button size="sm" className="rounded-full" onClick={acceptConsent}>
            J'ai compris
          </Button>
        </div>
      )}

      {access.canUpload && consent && (
        <div
          className="rounded-2xl border border-dashed p-4 flex flex-wrap items-center gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files, fileRef);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={access.acceptedFormats.join(",")}
            multiple
            className="hidden"
            onChange={(e) => pick(e.target.files, fileRef)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pick(e.target.files, cameraRef)}
          />
          <Button size="sm" className="rounded-full" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" /> Ajouter des photos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full sm:hidden"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" /> Prendre une photo
          </Button>
          <p className="text-xs text-muted-foreground">
            Glissez-déposez · {access.maxPerUpload} max par envoi · {access.maxFileSizeMb} Mo max ·{" "}
            {remaining} restante(s)
          </p>
        </div>
      )}

      {pendingUploads.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {queue.map((q) => (
            <li key={q.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
              {q.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              {q.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              {q.status === "paused" && <Pause className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
              {(q.status === "uploading" || q.status === "processing") && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
              )}
              {q.status === "queued" && <span className="h-3.5 w-3.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="truncate">{q.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {q.status === "error"
                      ? "Échec"
                      : q.status === "paused"
                        ? "Connexion perdue"
                        : q.status === "queued"
                          ? "En attente"
                          : `${Math.round(q.progress)}%`}
                  </span>
                </div>
                {q.status === "error" ? (
                  <p className="text-destructive text-[11px] mt-0.5 truncate">
                    Cette photo n'a pas pu être envoyée. {q.error}
                  </p>
                ) : (
                  <Progress value={q.progress} className="h-1 mt-1" />
                )}
              </div>
              {q.status === "error" && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => retry(q.id)}>
                  Réessayer
                </Button>
              )}
              {(q.status === "error" || q.status === "done") && (
                <button onClick={() => dismiss(q.id)} className="opacity-60 hover:opacity-100" aria-label="Fermer">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {queue.some((q) => q.status === "done") && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={clearDone}>
          Effacer les envois terminés
        </Button>
      )}

      {photos.length === 0 && !loading ? (
        <p className="text-xs text-muted-foreground italic py-4">Aucune photo pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group">
              <button
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                onClick={() => setLightbox(i)}
                aria-label={p.description ?? "Ouvrir la photo de l'événement"}
              >
                {p.url ? (
                  <img
                    src={p.url}
                    alt={p.description ?? "Photo de l'événement"}
                    loading="lazy"
                    decoding="async"
                    className={`aspect-square w-full object-cover rounded-lg ${p.status === "hidden" ? "opacity-40" : ""}`}
                  />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
                )}
              </button>
              {p.isCover && (
                <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0 gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" /> Couverture
                </Badge>
              )}
              {p.reportCount > 0 && (
                <Badge variant="destructive" className="absolute top-1 right-1 text-[10px] px-1.5 py-0 gap-0.5">
                  <Flag className="h-2.5 w-2.5" /> {p.reportCount}
                </Badge>
              )}
              <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                {access.canModerate && (
                  <>
                    <button
                      className="h-6 w-6 rounded-full bg-foreground/70 text-background grid place-items-center"
                      onClick={() => setCoverPhoto(p)}
                      aria-label="Définir comme couverture"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                    <button
                      className="h-6 w-6 rounded-full bg-foreground/70 text-background grid place-items-center"
                      onClick={() =>
                        actions.moderate.mutate({
                          photoId: p.id,
                          action: p.status === "hidden" ? "publish" : "hide",
                        })
                      }
                      aria-label={p.status === "hidden" ? "Réafficher la photo" : "Masquer la photo"}
                    >
                      {p.status === "hidden" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                  </>
                )}
                {(access.canModerate || p.mine) && (
                  <button
                    className="h-6 w-6 rounded-full bg-foreground/70 text-background grid place-items-center"
                    onClick={() => actions.remove.mutate(p.id)}
                    aria-label="Supprimer la photo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinel} />
      {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {!done && !loading && photos.length > 0 && (
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => void loadMore()}>
          Charger plus ({photos.length}/{total})
        </Button>
      )}

      {access.canModerate && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setShowSettings((v) => !v)}
              disabled={!access.canOverride}
            >
              <Settings2 className="h-3.5 w-3.5" /> Droits de l'album
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowReports((v) => !v)}>
              <Shield className="h-3.5 w-3.5" /> Signalements
            </Button>
          </div>

          {showSettings && access.canOverride && (
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Consultation</Label>
                <Select
                  value={settings.viewAudience}
                  onValueChange={(v) => setSettings((s) => ({ ...s, viewAudience: v as typeof s.viewAudience }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organizer">Organisateur uniquement</SelectItem>
                    <SelectItem value="confirmed">Participants confirmés</SelectItem>
                    <SelectItem value="all">Tous les invités</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Publication</Label>
                <Select
                  value={settings.uploadAudience}
                  onValueChange={(v) => setSettings((s) => ({ ...s, uploadAudience: v as typeof s.uploadAudience }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organizer">Organisateur uniquement</SelectItem>
                    <SelectItem value="confirmed">Participants confirmés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Album collaboratif</Label>
                <Switch
                  checked={settings.collaborative}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, collaborative: v }))}
                />
              </div>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() =>
                  actions.saveSettings.mutate(settings, {
                    onSuccess: () => toast.success("Droits enregistrés"),
                  })
                }
              >
                Enregistrer
              </Button>
            </div>
          )}

          {showReports && (
            <div className="rounded-2xl border p-4 space-y-3">
              {(reports.data?.reports ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucun signalement.</p>
              ) : (
                (reports.data?.reports ?? []).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    {r.thumbUrl && (
                      <img src={r.thumbUrl} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                    )}
                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <p className="font-medium">
                        {REPORT_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}
                      </p>
                      {r.comment && <p className="text-muted-foreground">{r.comment}</p>}
                      <p className="text-muted-foreground">
                        {r.reporterLabel ?? "Anonyme"} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                        {r.status === "pending" ? "À examiner" : "Traité"}
                      </p>
                      {r.status === "pending" && (
                        <div className="flex gap-1 pt-1">
                          {(["keep", "hide", "delete"] as const).map((d) => (
                            <Button
                              key={d}
                              size="sm"
                              variant={d === "delete" ? "destructive" : "outline"}
                              className="h-7 rounded-full text-[11px]"
                              onClick={() => resolveReport.mutate({ reportId: r.id, decision: d })}
                            >
                              {d === "keep" ? "Conserver" : d === "hide" ? "Masquer" : "Supprimer"}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {lightbox !== null && photos[lightbox] && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          access={access}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
          getAsset={actions.asset}
          onReport={(v) => actions.report.mutateAsync(v)}
          onNeedMore={() => void loadMore()}
        />
      )}

      <CoverCropDialog
        photo={coverPhoto}
        open={coverPhoto !== null}
        onOpenChange={(v) => !v && setCoverPhoto(null)}
        getAsset={actions.asset}
        onValidate={(crop) => {
          if (!coverPhoto) return;
          actions.cover.mutate(
            { photoId: coverPhoto.id, ...crop },
            { onSuccess: () => toast.success("Couverture définie") },
          );
          setCoverPhoto(null);
        }}
      />
    </div>
  );
}
