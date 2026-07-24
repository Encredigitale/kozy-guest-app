import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle2, Cake, Phone, MapPin, Utensils, AlertTriangle } from "lucide-react";
import { useExtensionSettings } from "@/core/extensions/useExtensionSettings";

export default function PersonalInfoWidget() {
  const { settings, isLoading } = useExtensionSettings("personal-info");
  const s = settings as Record<string, unknown>;

  const rows: { icon: React.ReactNode; label: string; value?: string }[] = [
    { icon: <Cake className="h-3.5 w-3.5" />, label: "Anniversaire", value: s.birthday as string | undefined },
    { icon: <Phone className="h-3.5 w-3.5" />, label: "Téléphone", value: s.phone as string | undefined },
    { icon: <MapPin className="h-3.5 w-3.5" />, label: "Ville", value: s.city as string | undefined },
    { icon: <Utensils className="h-3.5 w-3.5" />, label: "Régime", value: s.diet as string | undefined },
    { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Allergies", value: s.allergies as string | undefined },
  ];

  const filled = rows.filter((r) => r.value && String(r.value).trim().length > 0);
  const completion = Math.round((filled.length / rows.length) * 100);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <UserCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Informations personnelles</CardTitle>
            <CardDescription>
              {isLoading ? "Chargement…" : `Profil complété à ${completion}%`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filled.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Renseignez vos informations pour faciliter l'organisation par vos proches.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filled.map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{r.icon}</span>
                <span className="text-muted-foreground">{r.label} :</span>
                <span className="font-medium truncate">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild size="sm" variant="outline" className="rounded-full w-full">
          <Link to="/app/x/$" params={{ _splat: "personal-info/edit" }}>
            {filled.length === 0 ? "Compléter mon profil" : "Modifier"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
