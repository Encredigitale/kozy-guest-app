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
}
