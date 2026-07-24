import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useExtensionSettings } from "@/core/extensions/useExtensionSettings";

export default function PersonalInfoScreen() {
  const { settings, save, isLoading } = useExtensionSettings("personal-info");
  const s = settings as Record<string, unknown>;

  const [form, setForm] = useState({
    birthday: "",
    phone: "",
    address: "",
    city: "",
    diet: "any",
    allergies: "",
    notes: "",
  });

  useEffect(() => {
    setForm({
      birthday: (s.birthday as string) ?? "",
      phone: (s.phone as string) ?? "",
      address: (s.address as string) ?? "",
      city: (s.city as string) ?? "",
      diet: (s.diet as string) ?? "any",
      allergies: (s.allergies as string) ?? "",
      notes: (s.notes as string) ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ settings: form, scope: "global" });
      toast.success("Informations enregistrées.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <UserCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-primary">Informations personnelles</h1>
          <p className="text-sm text-muted-foreground">
            Partagez les informations utiles pour vous inviter et vous recevoir.
          </p>
        </div>
      </div>

      <Card className="mt-6 rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Mes informations</CardTitle>
          <CardDescription>Ces informations restent privées et vous appartiennent.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Date de naissance</Label>
                  <Input id="birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 6 …" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diet">Régime alimentaire</Label>
                <Select value={form.diet} onValueChange={(v) => set("diet", v)}>
                  <SelectTrigger id="diet"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Aucun</SelectItem>
                    <SelectItem value="vegetarian">Végétarien</SelectItem>
                    <SelectItem value="vegan">Végan</SelectItem>
                    <SelectItem value="gluten-free">Sans gluten</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="kosher">Casher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input id="allergies" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Arachides, fruits de mer…" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Préférences, informations utiles…" />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={save.isPending} className="rounded-full">
                  {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
