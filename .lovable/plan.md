# Studio d'administration SuperAdmin

## Ce que l'utilisateur verra
- Un SuperAdmin qui se connecte arrive directement dans le **Studio d'administration** (`/admin/dashboard`). Il ne voit jamais le tableau de bord utilisateur, même pas un instant : un écran neutre « Logo + Chargement… » s'affiche pendant la vérification.
- Un utilisateur standard arrive sur son tableau de bord habituel. S'il tape `/admin`, il est renvoyé vers son tableau de bord. S'il n'est pas connecté, il est renvoyé vers `/login`.
- Le Studio a son propre univers : sidebar à gauche (rétractable sur ordinateur, menu ☰ sur mobile) et un en-tête « Studio d'administration » avec la cloche et un menu « SuperAdmin ▼ » (Mon compte, Voir l'application, Se déconnecter).
- « Voir l'application » ouvre l'espace utilisateur. Un bandeau discret « ← Retour au Studio d'administration » s'affiche alors, seulement pour les SuperAdmin. À la connexion suivante, il revient toujours dans le Studio.
- Si le rôle ne peut pas être vérifié, le message « Impossible de vérifier vos autorisations. Veuillez réessayer. » s'affiche et aucun accès n'est donné.

## Navigation du Studio
Tableau de bord, Utilisateurs, Événements, Invitations, Types d'événements, Fonctionnalités, Contacts, Notifications, Statistiques, Paramètres, Journal système.
- Les écrans d'admin qui existent déjà (types d'événements, composantes de repas, types d'apports, contributions, écrans, studio de widgets, registry, extensions) passent dans le Studio. Leurs anciennes adresses redirigent vers les nouvelles.
- Nouveaux écrans consultables : Utilisateurs, Événements, Invitations, Contacts, Statistiques, Journal système. Ils sont en lecture seule dans un premier temps.
- Notifications et Paramètres : écrans simples, avec les réglages déjà présents quand il y en a.

## Tableau de bord
Il est construit avec des widgets indépendants, chacun dans son propre bloc : Utilisateurs (total + ce mois), Événements (total + à venir), Invitations (total + % acceptées), Fonctionnalités actives (x / y), Activité récente. L'ordre et la visibilité de chaque widget peuvent être configurés, ce qui prépare le déplacement, le masquage et le redimensionnement plus tard. Tous les chiffres viennent de vraies données, aucun n'est inventé.

## Détails techniques
- **Rôles** : on ajoute `superadmin` à l'enum `app_role` existante. La table `user_roles` et `has_role` restent inchangées, donc d'autres rôles pourront s'ajouter plus tard sans tout reconstruire. Les comptes qui ont aujourd'hui le rôle `admin` reçoivent `superadmin`. La nouvelle fonction `private.is_superadmin(uid)` sert à toutes les nouvelles règles d'accès. Les règles existantes basées sur `admin` restent valables.
- **Journal** : une table `admin_audit_log` (id, admin_user_id, action, entity_type, entity_id, metadata, created_at). Seuls les SuperAdmin peuvent la lire et y écrire. Elle enregistre l'activation ou la désactivation d'une fonctionnalité, les changements de types d'événements et les changements de paramètres.
- **Données admin** : toutes les données passent par des server functions `admin.functions.ts` avec `requireSupabaseAuth`. Chacune vérifie le rôle côté serveur via `is_superadmin` avant de lire quoi que ce soit, puis utilise l'accès privilégié uniquement pour les chiffres globaux. Un utilisateur standard reçoit une réponse 403.
- **Routes** : `src/routes/_authenticated/admin.tsx` est la mise en page du Studio. Son `beforeLoad` vérifie le rôle et redirige vers `/app` en cas de refus. On ajoute `admin.index` (redirection vers `/admin/dashboard`), `admin.dashboard` et les sous-pages. `/dashboard` est un alias de `/app`, le tableau de bord utilisateur.
- **Connexion** : après la connexion (et à l'ouverture de `/login` avec une session déjà active), une redirection selon le rôle : superadmin vers `/admin/dashboard`, sinon `/app`. `useSession` expose `isSuperAdmin` sans valeur optimiste.
- **Déconnexion** : on annule et vide le cache des requêtes, on appelle `signOut`, puis on redirige vers `/login` avec `replace`. Revenir en arrière ne réaffiche aucune donnée.
- **AppShell** : le bandeau « Retour au Studio » s'affiche pour les SuperAdmin. L'ancien lien admin intégré à l'app utilisateur est retiré.
- Les fonctionnalités (plugins) restent séparées des rôles : elles n'interviennent jamais dans l'accès au Studio.

## Hors périmètre pour l'instant
Modifier des utilisateurs ou des événements depuis le Studio (écrans en lecture seule), glisser-déposer des widgets (seul l'ordre et la visibilité sont prévus), rôles admin/moderator/support.
