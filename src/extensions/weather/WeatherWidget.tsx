import { useEffect, useState } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CloudSun, MapPin } from "lucide-react";

type Forecast = { day: string; temp: number; icon: string };

const MOCK: Forecast[] = [
  { day: "Aujourd'hui", temp: 22, icon: "☀️" },
  { day: "Demain", temp: 19, icon: "⛅" },
  { day: "Après-demain", temp: 17, icon: "🌦️" },
];

export default function WeatherWidget({ config }: WidgetProps) {
  const [city, setCity] = useState<string>((config?.city as string) ?? "");
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    const t = setTimeout(() => {
      setForecast(MOCK);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [city]);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <CloudSun className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Météo</CardTitle>
            <CardDescription>Prévision sur 3 jours (démo).</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ville…"
              className="pl-8"
            />
          </div>
          <Button size="sm" variant="outline" className="rounded-full" disabled>
            Rechercher
          </Button>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : forecast.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Saisissez une ville pour voir la météo.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {forecast.map((f) => (
              <div key={f.day} className="rounded-xl border border-border/60 p-3 text-center">
                <p className="text-xs text-muted-foreground">{f.day}</p>
                <p className="text-2xl">{f.icon}</p>
                <p className="text-sm font-medium">{f.temp}°C</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
