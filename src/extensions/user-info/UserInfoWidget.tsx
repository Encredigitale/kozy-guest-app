import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserCircle2 } from "lucide-react";
import { useAvatarUrl, useUserProfile } from "./useUserProfile";

export default function UserInfoWidget() {
  const { profile, foodPreferences, allergies, isLoading } = useUserProfile();
  const avatarUrl = useAvatarUrl(profile?.profile_picture_path);

  const checks = [
    !!profile?.first_name,
    !!profile?.last_name,
    !!profile?.phone,
    !!profile?.profile_picture_path,
    foodPreferences.length > 0,
    allergies.length > 0,
  ];
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{fullName || "Mon profil"}</CardTitle>
            <CardDescription>
              {isLoading ? "Chargement…" : `Profil complété à ${completion}%`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={isLoading ? 0 : completion} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          Vos informations aident vos proches à mieux vous recevoir.
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-full w-full">
          <Link to="/app/profile">{completion === 100 ? "Voir mon profil" : "Compléter mon profil"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
