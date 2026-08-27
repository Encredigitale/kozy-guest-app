import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPhotoUpload,
  deletePhoto,
  finalizePhoto,
  getPhotoAccess,
  getPhotoAsset,
  listEventPhotos,
  listPhotoReports,
  moderatePhoto,
  reportPhoto,
  resolvePhotoReport,
  saveEventPhotoSettings,
  setPhotoCover,
  updatePhotoDescription,
} from "@/lib/photos.functions";
import type { PhotoAccess, PhotoAuth, PhotoItem } from "./public-types";
import { buildVariants, putSigned, sleep } from "./pipeline";

const PAGE_SIZE = 30;
const MAX_ATTEMPTS = 4;

export function photosKey(eventId: string) {
  return ["photos", eventId];
}

export function usePhotoAccess(eventId: string, auth?: PhotoAuth) {
  return useQuery<PhotoAccess>({
    queryKey: [...photosKey(eventId), "access", auth?.invitationId ?? "me"],
    queryFn: () => getPhotoAccess({ data: { eventId, ...auth } }),
    staleTime: 30_000,
  });
}

/** Album paginé (chargement progressif, jamais l'album entier d'un coup). */
export function useEventPhotos(eventId: string, auth: PhotoAuth | undefined, enabled: boolean) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const offsetRef = useRef(0);

  const reset = useCallback(async () => {
    offsetRef.current = 0;
    setDone(false);
    setLoading(true);
    const res = await listEventPhotos({ data: { eventId, ...auth, offset: 0, limit: PAGE_SIZE } });
    setPhotos(res.photos);
    setTotal(res.total);
    offsetRef.current = res.photos.length;
    setDone(res.photos.length >= res.total);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, auth?.invitationId, auth?.token]);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    const res = await listEventPhotos({
      data: { eventId, ...auth, offset: offsetRef.current, limit: PAGE_SIZE },
    });
    setPhotos((prev) => [...prev, ...res.photos.filter((p) => !prev.some((q) => q.id === p.id))]);
    setTotal(res.total);
    offsetRef.current += res.photos.length;
    if (res.photos.length === 0 || offsetRef.current >= res.total) setDone(true);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, auth?.invitationId, auth?.token, loading, done]);

  useEffect(() => {
    if (enabled) void reset();
  }, [enabled, reset]);

  return { photos, total, loading, done, loadMore, reload: reset };
}

export type QueueItem = {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: "queued" | "processing" | "uploading" | "done" | "error" | "paused";
  error?: string;
  attempts: number;
};

/** File d'attente d'upload : traitement local, retry progressif, reprise réseau. */
export function usePhotoUploader(
  eventId: string,
  auth: PhotoAuth | undefined,
  access: PhotoAccess | undefined,
  onUploaded: () => void,
) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const running = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const patch = (id: string, p: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const processOne = useCallback(
    async (item: QueueItem) => {
      if (!access) return;
      patch(item.id, { status: "processing", progress: 5 });
      const { variants, width, height } = await buildVariants(item.file, access);
      const optimizedSize = variants.reduce((s, v) => s + v.blob.size, 0);

      const opened = await createPhotoUpload({
        data: {
          eventId,
          ...auth,
          mimeType: item.file.type || "image/jpeg",
          originalSize: item.file.size,
          keepOriginal: true,
        },
      });
      if (!opened.ok || !opened.paths || !opened.uploads || !opened.photoId) {
        throw new Error(uploadErrorLabel(opened.error));
      }

      patch(item.id, { status: "uploading", progress: 10 });
      const steps = variants.length + (opened.paths.original ? 1 : 0);
      let stepDone = 0;
      for (const v of variants) {
        await putSigned(opened.uploads[v.key]!, v.blob, "image/webp", (p) =>
          patch(item.id, { progress: 10 + ((stepDone + p / 100) / steps) * 85 }),
        );
        stepDone += 1;
      }
      if (opened.paths.original && opened.uploads.original) {
        await putSigned(opened.uploads.original, item.file, item.file.type || "image/jpeg", (p) =>
          patch(item.id, { progress: 10 + ((stepDone + p / 100) / steps) * 85 }),
        );
      }

      const res = await finalizePhoto({
        data: {
          eventId,
          ...auth,
          photoId: opened.photoId,
          thumbPath: opened.paths.thumb,
          mediumPath: opened.paths.medium,
          largePath: opened.paths.large,
          originalPath: opened.paths.original,
          mimeType: "image/webp",
          width,
          height,
          originalSize: item.file.size,
          optimizedSize,
        },
      });
      if (!res.ok) throw new Error(uploadErrorLabel(res.error));
      patch(item.id, { status: "done", progress: 100 });
    },
    [access, auth, eventId],
  );

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = queueRef.current.find((q) => q.status === "queued" || q.status === "paused");
        if (!next) break;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          patch(next.id, { status: "paused", error: "Connexion perdue" });
          break;
        }
        try {
          await processOne(next);
          onUploaded();
        } catch (e) {
          const attempts = next.attempts + 1;
          const message = e instanceof Error ? e.message : "Erreur inconnue";
          if (attempts < MAX_ATTEMPTS && message !== "Quota de l'événement atteint") {
            patch(next.id, { attempts, status: "queued", error: message, progress: 0 });
            await sleep(1000 * 2 ** attempts);
          } else {
            patch(next.id, { attempts, status: "error", error: message });
          }
        }
      }
    } finally {
      running.current = false;
    }
  }, [onUploaded, processOne]);

  const enqueue = useCallback(
    (files: File[]) => {
      setQueue((prev) => [
        ...prev,
        ...files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          progress: 0,
          status: "queued" as const,
          attempts: 0,
        })),
      ]);
      setTimeout(() => void pump(), 0);
    },
    [pump],
  );

  const retry = useCallback(
    (id: string) => {
      patch(id, { status: "queued", attempts: 0, error: undefined, progress: 0 });
      setTimeout(() => void pump(), 0);
    },
    [pump],
  );

  const dismiss = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));

  // Reprise automatique lorsque la connexion revient.
  useEffect(() => {
    const onOnline = () => {
      setQueue((prev) => prev.map((q) => (q.status === "paused" ? { ...q, status: "queued" } : q)));
      setTimeout(() => void pump(), 300);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [pump]);

  return { queue, enqueue, retry, dismiss, clearDone: () => setQueue((p) => p.filter((q) => q.status !== "done")) };
}

export function uploadErrorLabel(error?: string) {
  switch (error) {
    case "forbidden":
      return "Vous n'êtes pas autorisé à publier ici";
    case "unsupported_format":
      return "Format non pris en charge";
    case "too_large":
      return "Fichier trop volumineux";
    case "quota_event":
      return "Quota de l'événement atteint";
    case "rate_limited":
      return "Trop d'envois, réessayez dans un instant";
    default:
      return error ?? "Échec de l'envoi";
  }
}

export function usePhotoActions(eventId: string, auth?: PhotoAuth) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: photosKey(eventId) });

  return {
    asset: (photoId: string, size: "medium" | "large" | "original") =>
      getPhotoAsset({ data: { eventId, ...auth, photoId, size } }),
    remove: useMutation({
      mutationFn: (photoId: string) => deletePhoto({ data: { eventId, ...auth, photoId } }),
      onSuccess: invalidate,
    }),
    moderate: useMutation({
      mutationFn: (v: { photoId: string; action: "hide" | "publish" | "delete" }) =>
        moderatePhoto({ data: { eventId, ...auth, ...v } }),
      onSuccess: invalidate,
    }),
    cover: useMutation({
      mutationFn: (v: { photoId: string; cropX: number; cropY: number; cropWidth: number; cropHeight: number }) =>
        setPhotoCover({ data: { eventId, ...auth, ...v } }),
      onSuccess: invalidate,
    }),
    describe: useMutation({
      mutationFn: (v: { photoId: string; description: string }) =>
        updatePhotoDescription({ data: { eventId, ...auth, ...v } }),
      onSuccess: invalidate,
    }),
    report: useMutation({
      mutationFn: (v: { photoId: string; reason: string; comment?: string }) =>
        reportPhoto({ data: { eventId, ...auth, ...v } }),
    }),
    saveSettings: useMutation({
      mutationFn: (v: {
        viewAudience: "organizer" | "confirmed" | "all";
        uploadAudience: "organizer" | "confirmed";
        collaborative: boolean;
      }) => saveEventPhotoSettings({ data: { eventId, ...auth, ...v } }),
      onSuccess: invalidate,
    }),
  };
}

export function usePhotoReports(eventId: string, auth: PhotoAuth | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...photosKey(eventId), "reports"],
    enabled,
    queryFn: () => listPhotoReports({ data: { eventId, ...auth } }),
  });
}

export function useResolveReport(eventId: string, auth?: PhotoAuth) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { reportId: string; decision: "keep" | "hide" | "delete" }) =>
      resolvePhotoReport({ data: { eventId, ...auth, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: photosKey(eventId) }),
  });
}
