import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/welcome")({
  head: () => ({ meta: [{ title: "Bienvenue — Kosy" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [dietary, setDietary] = useState("");
  const [allergies, setAllergies] = useState("");
  const [drinks, setDrinks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("first_name, last_name, birth_date, dietary_preferences, allergies, favorite_drinks")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setBirthDate(data.birth_date ?? "");
          setDietary(data.dietary_preferences ?? "");
          setAllergies(data.allergies ?? "");
          setDrinks(data.favorite_drinks ?? "");
        }
        setLoading(false);
      });
  }, [user.id]);

  const save = async (skip = false) => {
    setSaving(true);
    if (!skip) {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          birth_date: birthDate || null,
          dietary_preferences: dietary.trim() || null,
          allergies: allergies.trim() || null,
          favorite_drinks: drinks.trim() || null,
        })
        .eq("id", user.id);
      if (error) {
        setSaving(false);
        toast.error("Impossible d'enregistrer.");
        return;
      }
      toast.success("Profil enregistré.");
    }
    navigate({ to: "/app" });
  };

  if (loading) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="font-serif text-4xl tracking-tight mb-3">Bienvenue !</h1>
        <p className="text-muted-foreground">
          Quelques informations nous permettront de personnaliser votre expérience.
          Toutes ces informations sont facultatives.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fn">Prénom</Label>
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln">Nom</Label>
            <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bd">Date de naissance</Label>
          <Input
            id="bd"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diet">Préférences alimentaires</Label>
          <Textarea
            id="diet"
            placeholder="Ex. végétarien, sans porc…"
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="al">Allergies</Label>
          <Textarea
            id="al"
            placeholder="Ex. arachides, gluten, lactose…"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dr">Boissons préférées</Label>
          <Textarea
            id="dr"
            placeholder="Ex. vin rouge, IPA, kombucha…"
            value={drinks}
            onChange={(e) => setDrinks(e.target.value)}
          />
        </div>

        <div className="pt-4 space-y-2">
          <Button type="submit" size="lg" className="w-full rounded-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Continuer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full rounded-full"
            onClick={() => save(true)}
            disabled={saving}
          >
            Passer pour l'instant
          </Button>
        </div>
      </form>
    </div>
  );
}
