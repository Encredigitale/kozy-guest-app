import * as Icons from "lucide-react";
import { Puzzle } from "lucide-react";

/** Icônes par défaut des fonctionnalités livrées, quand le manifest n'en fournit pas. */
const FALLBACK: Record<string, string> = {
  "ext.invitations": "Users",
  "ext.photos": "Camera",
  "ext.gifts": "Gift",
  "ext.contributions": "HandHeart",
  "ext.guest-brings": "ShoppingBasket",
  "event.menu": "UtensilsCrossed",
  "event.contributions": "HandHeart",
  "event.guests": "Users",
};

export function FeatureIcon({
  id,
  name,
  className,
}: {
  id: string;
  name?: string | null;
  className?: string;
}) {
  const key = name || FALLBACK[id] || "Puzzle";
  const Cmp =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key] ?? Puzzle;
  return <Cmp className={className} />;
}
