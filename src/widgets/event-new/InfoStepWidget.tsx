import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWizard } from "./context";

export default function InfoStepWidget() {
  const { title, setTitle, description, setDescription, startsAt, setStartsAt, location, setLocation, next, back, isLastStep, submit, saving, stepIndex, stepCount } = useWizard();
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Étape {stepIndex + 1} / {stepCount}</p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Informations</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0"><Label>Date de début</Label><Input className="w-full min-w-0" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div className="space-y-2 min-w-0"><Label>Lieu</Label><Input className="w-full min-w-0" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={back} className="rounded-full">Retour</Button>
          <Button disabled={!title.trim() || saving} onClick={() => (isLastStep ? void submit() : next())} className="rounded-full">{isLastStep ? (saving ? "Création…" : "Créer l'événement") : "Continuer"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
