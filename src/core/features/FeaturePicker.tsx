import { useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { FeatureIcon } from "./FeatureIcon";
import { categoryLabel, type EventFeature } from "./useEventFeatures";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  features: EventFeature[];
  onAdd: (feature: EventFeature) => void;
  busyId?: string | null;
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Sélecteur de fonctionnalités : bottom sheet sur mobile, panneau latéral
 * sur tablette/desktop. Une seule instance ouverte à la fois.
 */
export function FeaturePicker({ open, onOpenChange, features, onAdd, busyId }: Props) {
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = norm(q.trim());
    if (!term) return features;
    return features.filter(
      (f) => norm(f.name).includes(term) || norm(f.description ?? "").includes(term),
    );
  }, [features, q]);

  const recommended = filtered.filter((f) => f.recommended && f.state !== "active");
  const others = filtered.filter((f) => !f.recommended && f.state !== "active");
  const already = filtered.filter((f) => f.state === "active");

  const byCategory = useMemo(() => {
    const m = new Map<string, EventFeature[]>();
    for (const f of others) {
      const label = categoryLabel(f.category);
      if (!m.has(label)) m.set(label, []);
      m.get(label)!.push(f);
    }
    return [...m.entries()];
  }, [others]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "h-[85dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] flex flex-col bg-white"
            : "w-full sm:max-w-md flex flex-col bg-white"
        }
      >
        <SheetHeader className="text-left">
          <SheetTitle>Ajouter une fonctionnalité</SheetTitle>
          <SheetDescription>
            Choisissez uniquement ce dont vous avez besoin. Rien n'est imposé.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une fonctionnalité"
            className="h-11 pl-9"
            aria-label="Rechercher une fonctionnalité"
          />
        </div>

        <div className="-mx-2 mt-2 flex-1 overflow-y-auto px-2 pb-6">
          {recommended.length > 0 && (
            <Section title="Recommandées pour votre événement" icon>
              {recommended.map((f) => (
                <Row key={f.id} feature={f} onAdd={onAdd} busyId={busyId} />
              ))}
            </Section>
          )}

          {byCategory.map(([label, list]) => (
            <Section key={label} title={label}>
              {list.map((f) => (
                <Row key={f.id} feature={f} onAdd={onAdd} busyId={busyId} />
              ))}
            </Section>
          ))}

          {already.length > 0 && (
            <Section title="Déjà ajoutées">
              {already.map((f) => (
                <div
                  key={f.id}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-border/60 px-3 py-2 opacity-60"
                >
                  <FeatureIcon id={f.id} name={f.icon} className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm font-medium">{f.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-4 w-4" /> Ajoutée
                  </span>
                </div>
              ))}
            </Section>
          )}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune fonctionnalité ne correspond à votre recherche.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-2">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon && <Sparkles className="h-3.5 w-3.5 text-primary" />}
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  feature,
  onAdd,
  busyId,
}: {
  feature: EventFeature;
  onAdd: (f: EventFeature) => void;
  busyId?: string | null;
}) {
  const reactivate = feature.state === "inactive";
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-border/60 p-3">
      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 grid place-items-center">
        <FeatureIcon id={feature.id} name={feature.icon} className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{feature.name}</p>
        {feature.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{feature.description}</p>
        )}
        {reactivate && (
          <p className="text-xs text-primary">Données conservées</p>
        )}
      </div>
      <Button
        size="sm"
        variant={reactivate ? "outline" : "default"}
        className="h-11 shrink-0 rounded-full px-4"
        disabled={busyId === feature.id}
        onClick={() => onAdd(feature)}
      >
        {reactivate ? "Réactiver" : "Ajouter"}
      </Button>
    </div>
  );
}
