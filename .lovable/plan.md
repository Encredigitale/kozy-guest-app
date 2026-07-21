Ce chantier regroupe 9 demandes en 2 axes. Je propose de le livrer en **3 lots** livrables indépendamment.

## Lot A — Widget Photos & Documents (UI/UX)

**A1. Photos : tri manuel + couverture + drag-and-drop + vignettes**
- Ajouter `sort_order` (integer) et `is_cover` (bool) dans `widget_items` (via migration, valeurs par défaut safe).
- Utiliser `@dnd-kit/core` + `@dnd-kit/sortable` (déjà à installer) pour le glisser-déposer.
- Génération de vignettes côté client via Canvas API (max 400×400, JPEG 0.8) uploadées dans un dossier `thumbs/` du bucket `widget-photos`. Stockées dans `data.thumb_path`.
- Bouton "Définir comme couverture" par photo, badge visuel sur la couverture, tri par `sort_order` puis `created_at`.

**A2. Documents : aperçu intégré PDF + images**
- Modal d'aperçu (Dialog shadcn) :
  - PDF → `<iframe>` avec signed URL
  - Images → `<img>` avec signed URL
  - Autres → message "Aperçu non disponible, téléchargez le fichier"
- Bouton "Télécharger" séparé (déjà présent, on le conserve).

**A3. Progression + erreurs pour uploads/downloads**
- Composant `<UploadProgress />` réutilisable (barre par fichier, état pending/uploading/error/done).
- Utilisation de `XMLHttpRequest` pour capter `progress` sur upload (Supabase JS ne l'expose pas nativement) → route via signed upload URL.
- Messages d'erreur explicites : taille, type MIME, réseau, quota.
- Toasts sonner détaillés + retry par fichier échoué.

## Lot B — Config d'extensions & scope événement

**B1. Table `extension_settings`**
```sql
extension_settings (
  id uuid PK,
  extension_key text NOT NULL,
  event_id uuid NULL,      -- NULL = global, sinon override par événement
  user_id uuid NOT NULL,   -- propriétaire (organisateur)
  settings jsonb NOT NULL DEFAULT '{}',
  UNIQUE (extension_key, event_id, user_id)
)
```
- RLS : owner only via `auth.uid()`.
- Hook `useExtensionSettings(extensionKey, eventId?)` avec merge global → event.

**B2. Manifest enrichi**
Ajout aux `ExtensionDefinition` :
```ts
settingsSchema?: Array<{ key, label, type: 'text'|'number'|'boolean'|'select', options?, default? }>;
settingsComponent?: LazyExoticComponent;  // écran custom si besoin
scope?: 'global' | 'event' | 'both';       // par défaut 'global'
```

**B3. Écrans de configuration**
- `/app/admin/extensions/$key` : réglages globaux (form auto-généré depuis `settingsSchema` OU `settingsComponent` custom).
- Dans la page événement : nouvel onglet/section "Extensions" → activer/désactiver par événement + régler les paramètres locaux.
- Table `event_extensions (event_id, extension_key, enabled)` pour l'activation par événement.

**B4. Résolution en runtime**
- `useActiveExtensions(eventId?)` filtre : globalement activé ET (pas de scope event OU activé pour cet événement).
- Les widgets d'extension reçoivent leurs settings mergés via `context`.

## Lot C — Ordre, installation manifest, versioning

**C1. Ordre des menus sidebar**
- Colonne `sort_order` (int) sur `extensions`.
- Colonne `menu_order` (jsonb, `{ path: order }`) pour ordonner les entrées d'une même extension.
- Interface admin drag-and-drop pour réordonner les extensions et leurs menus.
- `AppShell` trie par `sort_order` puis `menu.order`.

**C2. Versioning + compat**
Ajout à la table `extensions` :
```sql
version text NOT NULL DEFAULT '0.0.0',
min_core_version text NOT NULL DEFAULT '0.0.0',
min_db_version int NOT NULL DEFAULT 1,
manifest jsonb  -- manifeste JSON complet importé
```
- Constantes `CORE_VERSION` (semver) et `DB_VERSION` (int) exposées depuis `src/core/version.ts`.
- Helper `isCompatible(extension)` utilisé :
  - au toggle activation (bloque + toast explicatif)
  - au démarrage (extensions incompatibles marquées "⚠️ Incompatible" et non chargées)

**C3. Installation via manifest**
- Écran `/app/admin/extensions/install` avec 2 modes :
  - **Coller JSON** (textarea)
  - **URL** (fetch client → GET JSON)
- Validation Zod du manifest (schéma strict : `key`, `name`, `version`, `min_core_version`, `min_db_version`, `widgets[]`, `screens[]`, `menu[]`, `settingsSchema?`, `scope?`).
- Le manifest décrit **quels widgets/écrans** l'extension apporte mais **le code doit être présent** dans `src/extensions/<key>/` et déclaré dans `registry.ts` — sinon badge "Code manquant" (déjà géré).
- Note importante : dans une SPA/PWA sans store dynamique, on ne peut pas exécuter du code téléchargé à chaud sans risque sécurité majeur. L'installation par manifest **enregistre les métadonnées et active l'entrée** ; le code des widgets doit toujours être fourni via un build. Ceci sera clairement expliqué dans l'UI.

## Détails techniques

- **Nouvelles dépendances** : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `semver`.
- **Migrations** : 3 migrations distinctes (Lot A schema, Lot B tables, Lot C versioning + colonnes).
- **RLS** : toutes les nouvelles tables ont RLS activé, scopé à `auth.uid()`.
- **Types Zod** partagés dans `src/core/extensions/manifest.schema.ts`.
- **Rétrocompat** : les 4 extensions existantes reçoivent `version=1.0.0`, `min_core_version=0.0.0` pour rester activables.

## Question d'orientation

**Ordre de livraison souhaité ?**
1. Tout en une passe (long, ~gros diff)
2. Lot A d'abord, puis B, puis C (recommandé — chaque lot vérifiable)
3. Prioriser B + C (extensions) car c'est plus structurel, puis A

Confirme l'ordre (ou dis "tout en une passe") et je démarre.
