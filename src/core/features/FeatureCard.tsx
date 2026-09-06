import { Suspense, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, ArrowUp, ArrowDown, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { resolveWidgetComponent } from "@/core/registry/components";
import { FeatureIcon } from "./FeatureIcon";
import { FeatureSummary, FeatureProgress } from "./FeatureSummary";
import type { EventFeature } from "./useEventFeatures";

type Props = {
  feature: EventFeature;
  eventId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onDisable: () => void;
  /** Faux pour un invité : lecture seule. */
  canManage?: boolean;
  /** Ouvre la carte à l'arrivée (deep link depuis la recherche). */
  defaultOpen?: boolean;
};

/**
 * Carte générique d'une fonctionnalité active. Le contenu du plugin n'est
 * monté que lorsque l'utilisateur ouvre la carte (chargement paresseux).
 */
export function FeatureCard({ feature, eventId, canMoveUp, canMoveDown, onMove, onDisable, canManage = true, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirm, setConfirm] = useState(false);
  const Component = open ? resolveWidgetComponent(feature.component) : null;

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [defaultOpen]);

  return (
    <div ref={ref}>
      <Card className="rounded-2xl border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start gap-3 p-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 grid place-items-center">
              <FeatureIcon id={feature.id} name={feature.icon} className="h-5 w-5 text-primary" />
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="min-w-0 flex-1 text-left"
              aria-expanded={open}
            >
              <p className="font-medium leading-tight">{feature.name}</p>
              <div className="mt-1">
                <FeatureSummary featureId={feature.id} eventId={eventId} />
                <FeatureProgress featureId={feature.id} eventId={eventId} />
              </div>
            </button>
            {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full"
                  aria-label={`Actions pour ${feature.name}`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpen(true)}>Ouvrir</DropdownMenuItem>
                <DropdownMenuItem disabled={!canMoveUp} onClick={() => onMove(-1)}>
                  <ArrowUp className="h-4 w-4" /> Monter
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canMoveDown} onClick={() => onMove(1)}>
                  <ArrowDown className="h-4 w-4" /> Descendre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirm(true)}>
                  <EyeOff className="h-4 w-4" /> Désactiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between border-t border-border/60 px-4 py-3 text-sm font-medium text-primary"
          >
            {open ? "Réduire" : "Voir"}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {open && Component && (
            <div className="border-t border-border/60 p-3 [&>*]:border-0 [&>*]:bg-transparent [&>*]:shadow-none">
              <Suspense
                fallback={<p className="p-3 text-sm text-muted-foreground">Chargement…</p>}
              >
                <Component config={{ eventId }} />
              </Suspense>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver « {feature.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos données sont conservées. Vous pourrez réactiver cette fonctionnalité à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirm(false);
                onDisable();
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
