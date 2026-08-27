import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { usePhotoAccess } from "./usePhotos";
import PhotoAlbum from "./PhotoAlbum";

export default function PhotosWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string | undefined;
  const { data: access, isLoading } = usePhotoAccess(eventId ?? "", undefined);

  if (!eventId) return null;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Photos de l'événement</CardTitle>
            <CardDescription>Album privé, réservé aux personnes autorisées.</CardDescription>
          </div>
          {access && <span className="text-xs text-muted-foreground">{access.photoCount}</span>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !access ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : !access.enabled ? (
          <p className="text-xs text-muted-foreground italic">L'album photo n'est pas activé pour cet événement.</p>
        ) : !access.canView ? (
          <p className="text-xs text-muted-foreground italic">
            Vous n'avez pas accès à l'album photo de cet événement.
          </p>
        ) : (
          <PhotoAlbum eventId={eventId} access={access} />
        )}
      </CardContent>
    </Card>
  );
}
