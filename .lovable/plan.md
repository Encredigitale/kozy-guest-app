## Objectif

Rendre tous les écrans 100% pilotés par le Registry (aucun widget en dur), enrichir le modèle pour associer widgets ↔ événements/profils, ajouter la notion de layout (taille/position/ordre) et un Studio Admin complet (CRUD, activer, configurer, associer, réordonner drag&drop, permissions, prévisualiser, publier).

## État actuel (résumé)

- `event.detail` : déjà via `WidgetRenderer` — à conserver, ajouter le panneau extensions en tant que widget dédié.
- `app.index.tsx` (dashboard) : liste statique de cartes, **pas** de rendu widget → à refondre en surface `dashboard`.
- `app.events.new.tsx` : formulaire hardcodé → à refondre en surface `event.new` (steps = widgets).
- Modèle `widgets.manifest` (jsonb) : surface/order/permissions/eventTypes plats — pas de `size`, pas de `status` publish, pas d'association typée events/profils.

## Modèle de données (migrations)

### 1. Enrichir `public.widgets`
- Ajouter `status text` (`'draft' | 'published'`, défaut `'draft'`).
- Ajouter `size text` (`'sm' | 'md' | 'lg' | 'full'`, défaut `'full'`).
- Le manifeste JSON reste la source pour surface/order/eventTypes/permissions, mais le studio écrit désormais via des champs structurés.

### 2. Placements par événement — `public.event_widgets`
```
event_id uuid FK, widget_id text FK, enabled bool, position int, size text nullable
PRIMARY KEY (event_id, widget_id)
```
Si présent → surcharge le placement par défaut du widget pour cet événement. Sinon → le widget hérite de son manifeste (eventTypes/order/size).

### 3. Associations par profil — `public.widget_role_bindings`
```
widget_id text FK, role text  -- ex 'organizer','guest','admin', ou app_role custom
PRIMARY KEY (widget_id, role)
```
Écrit par le studio; lecture fusionnée avec `manifest.permissions` en OR.

### 4. Layout dashboard — `public.dashboard_layout`
```
user_id uuid nullable (null = défaut global édité par superadmin),
widget_id text FK, position int, size text, visible bool
PRIMARY KEY (user_id nullable, widget_id)
```
Le superadmin édite la ligne globale (`user_id IS NULL`); un utilisateur peut la surcharger plus tard (hors scope MVP).

RLS : lecture publique/authentifiée selon rôle, écriture réservée à `has_role('admin')`. GRANTs conformes.

## Moteur (Core)

### `src/core/registry/useRegistry.ts`
- `useSurfaceWidgets(surface, ctx)` étendu : accepte `eventId?`. Quand fourni, fusionne `event_widgets` (override placement/size/enabled) pour la surface `event.detail`.
- Retourne `{ widget, size, order, config }[]` afin que le renderer connaisse la taille.
- Ajoute filtre `status = 'published'` sauf pour l'admin en mode preview.

### `src/core/registry/WidgetRenderer.tsx`
- Rend une **grille CSS** responsive (`grid grid-cols-12 gap-6`).
- `size` mappé : `sm=col-span-4`, `md=col-span-6`, `lg=col-span-8`, `full=col-span-12` (mobile = `col-span-12`).
- Skeleton par tuile pendant Suspense.

### Surfaces normalisées
- `dashboard` — cartes vue d'ensemble (nouveau).
- `event.new` — steps du wizard de création.
- `event.detail` — inchangé.
- `admin.studio` — surface pour widgets internes admin (optionnel).

## Écrans refactorés

### `app.index.tsx` (Dashboard)
- Devient un simple `<WidgetRenderer surface="dashboard" />`.
- Widgets de dashboard livrés (nouveaux, minimaux) : `dashboard.upcoming-events`, `dashboard.recent-activity`, `dashboard.stats`, `dashboard.quick-actions`. Layout initial seedé dans `dashboard_layout` (user_id NULL).

### `app.events.new.tsx`
- Devient un enchaînement de widgets sur la surface `event.new`, un par étape :
  - `event.new.type` (choix type)
  - `event.new.info` (titre/date/lieu)
  - `event.new.widgets` (choix des widgets initialement activés pour l'événement — coche la liste des widgets par défaut selon type)
- Un composant `WizardShell` fournit contexte `step`, `next`, `back` via `context`.

### `app.events.$eventId.tsx`
- Rien à changer côté rendu ; `EventExtensionsPanel` déplacé dans un widget `event.extensions` (organizer only) inséré via registry.

## Studio Admin

Nouvelle route parent `/app/admin/studio` avec onglets :

1. **Widgets** (`/app/admin/studio/widgets`)
   - Liste triable (drag&drop dnd-kit sur `order` par surface).
   - Filtre surface + statut.
   - Actions : activer/désactiver, publier/dépublier (`status`), dupliquer, supprimer (bloqué si `required`).
   - Formulaire d'édition **structuré** (au lieu du JSON brut) :
     - identité (id lock si existant, name, description, version, category, icon)
     - surface (select), order (int), size (select), status (select)
     - permissions (checkboxes admin/organizer/guest + input rôles custom)
     - eventTypes (multi-input tags)
     - dependencies (multi-select parmi widgets existants)
     - config (JSON textarea repliable — accès power-user)
     - required, visible (switches)
   - Bouton **Prévisualiser** : dialog qui rend `<WidgetRenderer surface={w.manifest.surface} contextualRoles={[preview role]} />` avec un event fictif; utilise le composant existant.
   - Bouton **Publier** : bascule `status` draft/published.

2. **Événements** (`/app/admin/studio/events`)
   - Sélecteur d'événement → tableau des widgets `event.detail`.
   - Toggle enabled, réordonner (dnd), changer size.
   - Écrit dans `event_widgets`; reset = supprime la ligne (hérite du manifeste).

3. **Profils** (`/app/admin/studio/roles`)
   - Matrice widgets × rôles ; coche = insert dans `widget_role_bindings`.

4. **Dashboard** (`/app/admin/studio/dashboard`)
   - dnd-kit sur widgets de surface `dashboard` : ajouter/retirer, ordonner, choisir size (sm/md/lg/full), visibilité. Écrit dans `dashboard_layout` (user_id NULL).

L'ancienne route `/app/admin/registry` redirige vers `/app/admin/studio/widgets`.

## Technique

- Migration SQL unique (tables + GRANTs + RLS + triggers `updated_at` + seed layout dashboard par défaut).
- Hooks : `useEventWidgets(eventId)`, `useWidgetRoleBindings(widgetId)`, `useDashboardLayout()`.
- Réutiliser `@dnd-kit` déjà installé.
- TanStack Query pour tous les hooks; invalidation ciblée à chaque mutation.
- `types.ts` : ajouter `WidgetSize`, `WidgetStatus`; élargir `WidgetManifest` (rétrocompatible, tous champs additionnels optionnels).
- `WidgetRenderer` : shape retour du hook = `Placement[]` avec `size`.

## Sécurité

- Toutes les nouvelles tables : RLS + GRANTs (select authentifié ; write admin uniquement via `has_role`).
- `event_widgets` : select autorisé pour organizer/participant de l'événement, write pour organizer + admin.
- Preview admin : contourne `status='published'` seulement si `has_role('admin')`.

## Livraisons hors scope (à documenter)

- Layout dashboard par utilisateur (déjà provisionné en table, non exposé dans le studio MVP).
- Association widgets ↔ profils via rôles custom au-delà de admin/organizer/guest : supporté en base mais UI limitée aux 3 rôles standards + input libre.
- Édition de code source d'un widget depuis l'UI (les composants restent livrés dans `src/widgets/*`).