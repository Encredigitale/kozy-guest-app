import type { ComponentType } from "react";

/**
 * Contexte transmis à chaque widget lors du rendu.
 * Chaque surface (event.detail, dashboard, contact.detail…) définit
 * les champs qu'elle fournit.
 */
export type WidgetContext = {
  eventId?: string;
  eventType?: string;
  userId?: string;
  [key: string]: unknown;
};

export type WidgetSurface =
  | "event.detail"
  | "event.new"
  | "dashboard"
  | "contact.detail";

/**
 * Définition déclarative d'un widget.
 * Aucun écran ne connaît directement le composant — les surfaces
 * interrogent le Registry et le WidgetRenderer les instancie.
 */
export interface WidgetDefinition {
  /** Identifiant unique et stable. */
  id: string;
  /** Nom affichable (Studio d'admin — usage futur). */
  name: string;
  description?: string;
  version?: string;
  category?: string;

  /** Surface d'affichage cible. */
  surface: WidgetSurface;
  /** Ordre d'affichage croissant. */
  order: number;

  /** Widget actif dans le Registry. */
  enabled: boolean;
  /** Ne peut pas être désactivé (widgets Core métier). */
  required?: boolean;
  /** Types d'événements pour lesquels le widget s'affiche. Vide = tous. */
  eventTypes?: string[];
  /** Permissions requises (usage futur). */
  permissions?: string[];

  /** Composant rendu par le WidgetRenderer. */
  component: ComponentType<{ context: WidgetContext }>;
}
