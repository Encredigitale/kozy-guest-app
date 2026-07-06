/**
 * Enregistrement des Widgets métier dans le Registry.
 *
 * Ce fichier est le SEUL endroit où les widgets sont référencés côté code.
 * Les surfaces (écrans) n'importent jamais un widget directement.
 *
 * Pour ajouter un widget : créer son composant sous `src/widgets/<id>/`
 * puis ajouter un `registerWidget(...)` ci-dessous. Aucune modification
 * du Core ni des écrans existants n'est nécessaire.
 */
import { registerWidget } from "@/core/widgets";

import { EventInfoWidget } from "./event-info/EventInfoWidget";
import { EventGuestsWidget } from "./event-guests/EventGuestsWidget";
import { EventRsvpsWidget } from "./event-rsvps/EventRsvpsWidget";
import { EventContributionsWidget } from "./event-contributions/EventContributionsWidget";
import { ContactHeaderWidget } from "./contact-header/ContactHeaderWidget";
import { ContactProfileWidget } from "./contact-profile/ContactProfileWidget";
import { ContactActionsWidget } from "./contact-actions/ContactActionsWidget";
import { DashboardHeaderWidget } from "./dashboard-header/DashboardHeaderWidget";
import { DashboardCreateCtaWidget } from "./dashboard-create-cta/DashboardCreateCtaWidget";
import { DashboardEventsWidget } from "./dashboard-events/DashboardEventsWidget";
import { EventNewStep1Widget } from "./event-new/EventNewStep1Widget";
import { EventNewStep2Widget } from "./event-new/EventNewStep2Widget";
import { EventNewStep3Widget } from "./event-new/EventNewStep3Widget";

let bootstrapped = false;

export function bootstrapWidgets() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerWidget({
    id: "event.info",
    name: "Informations générales",
    description: "Type, titre, date, lieu, description et menu de l'événement.",
    surface: "event.detail",
    order: 10,
    enabled: true,
    required: true,
    category: "core",
    component: EventInfoWidget,
  });

  registerWidget({
    id: "event.guests",
    name: "Invités",
    description: "Liste d'invités et envoi d'invitations personnelles.",
    surface: "event.detail",
    order: 20,
    enabled: true,
    required: true,
    category: "core",
    component: EventGuestsWidget,
  });

  registerWidget({
    id: "event.rsvps",
    name: "Réponses",
    description: "Réponses reçues des invités (oui / peut-être / non).",
    surface: "event.detail",
    order: 30,
    enabled: true,
    category: "core",
    component: EventRsvpsWidget,
  });

  registerWidget({
    id: "event.contributions",
    name: "Contributions",
    description: "Ce que les invités apportent (plats, boissons, matériel…).",
    surface: "event.detail",
    order: 40,
    enabled: true,
    category: "core",
    component: EventContributionsWidget,
  });

  registerWidget({
    id: "contact.header",
    name: "En-tête contact",
    description: "Avatar, nom, groupe et statistiques de sollicitation.",
    surface: "contact.detail",
    order: 10,
    enabled: true,
    required: true,
    category: "core",
    component: ContactHeaderWidget,
  });

  registerWidget({
    id: "contact.profile",
    name: "Profil éditable",
    description: "Identité, coordonnées, préférences et notes du contact.",
    surface: "contact.detail",
    order: 20,
    enabled: true,
    required: true,
    category: "core",
    component: ContactProfileWidget,
  });

  registerWidget({
    id: "contact.actions",
    name: "Actions",
    description: "Inviter à un événement ou supprimer le contact.",
    surface: "contact.detail",
    order: 30,
    enabled: true,
    category: "core",
    component: ContactActionsWidget,
  });


  registerWidget({
    id: "dashboard.header",
    name: "En-tête tableau de bord",
    description: "Salutation personnalisée et déconnexion.",
    surface: "dashboard",
    order: 10,
    enabled: true,
    required: true,
    category: "core",
    component: DashboardHeaderWidget,
  });

  registerWidget({
    id: "dashboard.create-cta",
    name: "Créer un événement",
    description: "Bouton d'accès rapide au formulaire de création.",
    surface: "dashboard",
    order: 20,
    enabled: true,
    category: "core",
    component: DashboardCreateCtaWidget,
  });

  registerWidget({
    id: "dashboard.events",
    name: "Mes événements",
    description: "Recherche, filtres et sections (mes moments, invitations, souvenirs).",
    surface: "dashboard",
    order: 30,
    enabled: true,
    required: true,
    category: "core",
    component: DashboardEventsWidget,
  });

  registerWidget({
    id: "event.new.basics",
    name: "Informations essentielles",
    description: "Étape 1 : titre, date, heure et lieu de l'événement.",
    surface: "event.new",
    order: 10,
    enabled: true,
    required: true,
    category: "core",
    component: EventNewStep1Widget,
  });

  registerWidget({
    id: "event.new.details",
    name: "Détails et personnalisation",
    description: "Étape 2 : type, cercle invité, menu et description.",
    surface: "event.new",
    order: 20,
    enabled: true,
    required: true,
    category: "core",
    component: EventNewStep2Widget,
  });

  registerWidget({
    id: "event.new.guests",
    name: "Invités",
    description: "Étape 3 : sélection des invités depuis le carnet ou création rapide.",
    surface: "event.new",
    order: 30,
    enabled: true,
    required: true,
    category: "core",
    component: EventNewStep3Widget,
  });
}
