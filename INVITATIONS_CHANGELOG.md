# Invitations libres — compte rendu

## Diagnostic
Le module Invitations utilisait des liens personnels rattachés à une fiche invité. La page publique vérifiait déjà le token et réutilisait les réponses, contributions et photos autorisées. Aucun lien partagé réutilisable n’existait. Les événements créés sont initialement des brouillons : leur confidentialité est conservée.

## Ajouts
- Un lien unique généré automatiquement pour chaque événement nouveau ou existant.
- Bloc « Inviter par lien » immédiatement visible à l’organisateur sur la fiche événement, même sans activer Invitations.
- Copier, WhatsApp et partage natif (copie de secours), URL issue du paramètre APP_URL.
- Gestion centralisée dans Invitations : désactiver/régénérer avec confirmation. Les invitations personnelles existantes restent valides.
- Prénom et nom obligatoires avant tout contenu événement ; inscription sans compte, puis redirection vers le parcours personnel existant.
- Capacité aléatoire distincte conservée sur l’appareil pour éviter les inscriptions répétées. Seul son hash est enregistré ; aucune fusion par nom.
- Mention « Lien libre » sur les invités concernés et actualisation de la liste toutes les 15 secondes.
- Bouton pour conserver son lien personnel et retrouver/modifier sa réponse selon les réglages existants.

## Fichiers
- `src/extensions/invitations/free-link.schema.ts` et `.test.ts`
- `src/lib/invitation-links.functions.ts`
- `src/extensions/invitations/InviteByLink.tsx`
- `src/extensions/invitations/InvitationsWidget.tsx`, `useInvitations.ts`
- `src/routes/invitation.$token.tsx`
- `src/routes/invitation.$eventId.$invitationId.tsx`
- `src/routes/_authenticated/app.events.$eventId.index.tsx`
- Migration `20261105200750_1c89d1d0-49a8-4ed9-a4ad-212f8d6dbf53.sql`
- Types Supabase et arbre des pages générés automatiquement ; dépendance de tests Vitest ; règles d’architecture et feuille de route.

## Données et sécurité
Table `event_invitation_links` : événement, token et état actif ; accès réservé à l’organisateur. Ajout de prénom, nom, origine et hash de retour aux invitations. Déclencheur de création et remplissage pour les événements existants. Fonction d’inscription atomique accessible seulement au service serveur ; elle vérifie le lien, l’état publié, la révocation et l’expiration. Aucun accès direct visiteur aux tables n’est ajouté, aucune invitation nominative n’est supprimée.

## Vérifications
- 10 tests réussis : prénom/nom requis, espaces, caractères interdits, piège antibot, état actif, brouillons/archives, URL configurée.
- Refus public d’un token inexistant à 320, 390 et 1280 px : pas de débordement, pas d’information privée, aucune erreur navigateur.
- Compilation sans erreur.

## Limites
Le Supabase externe ne fournit pas de session de test : création réelle, inscription valide de plusieurs personnes, réponses, retour, partage WhatsApp/natif et révocation ne sont pas vérifiés de bout en bout.
Les brouillons affichent le lien mais ne permettent pas son partage avant publication, afin de préserver leur confidentialité.
Le piège antibot et les validations ne constituent pas une protection robuste contre des attaques automatisées. Pas de primitive standard de limitation disponible : une limitation sur mesure requiert confirmation avant ajout.
Quatre alertes de sécurité préexistantes signalées par la migration ne sont pas dues à ce changement (table sans politique, extension publique, fonction privilégiée accessible aux utilisateurs connectés, protection des mots de passe compromis désactivée).