import type { ComponentType } from "react";
import {
  CakeSlice,
  Croissant,
  CupSoda,
  Flower2,
  Gift,
  Package,
  Plus,
  Salad,
  Sandwich,
  Utensils,
  Wheat,
  Wine,
} from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Wine,
  CakeSlice,
  Flower2,
  Gift,
  Croissant,
  Wheat,
  CupSoda,
  Plus,
  Utensils,
  Salad,
  Sandwich,
  Package,
};

export const CONTRIBUTION_ICON_NAMES = Object.keys(ICONS);

export function ContributionIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Gift;
  return <Icon className={className} />;
}
