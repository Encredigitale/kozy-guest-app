import { Card, CardContent } from "@/components/ui/card";
import { Camera, Lock } from "lucide-react";
import { usePhotoAccess } from "./usePhotos";
import PhotoAlbum from "./PhotoAlbum";

/** Bloc « Photos » affiché sur la page publique d'invitation. */
export default function PhotosBlock({
  eventId,
  invitationId,
  token,
}: {
  eventId: string;
  invitationId: string;
  token: string;
}) {
  const auth = { invitationId, token };
  const { data: access, isLoading } = usePhotoAccess(eventId, auth);

  if (isLoading || !access || !access.enabled) return null;

  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Photos de l'événement</p>
            <p className="text-xs text-muted-foreground">Album privé partagé entre les participants.</p>
          </div>
        </div>

        {access.pending ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Confirmez votre participation pour accéder à l'album.
          </p>
        ) : !access.canView ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> L'album est réservé à l'organisateur.
          </p>
        ) : (
          <PhotoAlbum eventId={eventId} access={access} auth={auth} />
        )}
      </CardContent>
    </Card>
  );
}
