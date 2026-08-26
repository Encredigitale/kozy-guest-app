import type { ComponentType } from "react";
import {
  Armchair,
  Car,
  Coins,
  Gift,
  HandHeart,
  Music,
  Package,
  PartyPopper,
  Projector,
  Sparkles,
  Truck,
  Users,
  Utensils,
  Wine,
} from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Package,
  Utensils,
  Wine,
  Armchair,
  HandHeart,
  Gift,
  Coins,
  Users,
  Car,
  Truck,
  Projector,
  Music,
  Sparkles,
  PartyPopper,
};

export const NEED_ICON_NAMES = Object.keys(ICONS);

export function NeedIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Package;
  return <Icon className={className} />;
}
