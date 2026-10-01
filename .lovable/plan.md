# Plugin « Messages » — une discussion commune par événement

## Ce que l'utilisateur verra
- **Activation** : « 💬 Messages — Échangez facilement avec tous les participants de votre événement. » apparaît dans « + Ajouter une fonctionnalité ». La désactiver masque la discussion sans rien supprimer, et la réactiver fait réapparaître les anciens messages.
- **Carte sur la page événement** : nombre de nouveaux messages propre à chaque personne, aperçu du dernier message visible (« Julie : On se retrouve à 19h30 ? ») et bouton « Voir la discussion ». Quand il n'y a encore rien : « Aucun message pour le moment » avec le bouton « Écrire un message ».
- **Écran de discussion** (pensé d'abord pour le téléphone) :
  - En haut : « ← Nom de l'événement · Messages · N participants ».
  - Les messages sont rangés du plus ancien au plus récent, et l'écran s'ouvre au niveau des nouveaux.
  - Chaque message affiche l'avatar, le prénom et l'heure. Vos propres messages sont colorés différemment.
  - Le champ « Écrire un message… », le bouton ➤ et le bouton « + » pour ajouter une photo restent fixés en bas, même quand le clavier est ouvert.
- **Contenu d'un message** : texte, emoji, retours à la ligne, et une photo prise sur le moment ou choisie dans la galerie, avec une légende si on veut. Aucun autre type de fichier.
- **Actions** via « ••• » ou un appui long :
  - L'auteur peut modifier son message (la mention « modifié » s'affiche) ou le supprimer après confirmation (« Message supprimé » reste visible).
  - L'organisateur peut supprimer le message d'un autre participant, mais jamais le modifier. Chaque suppression est notée dans un journal de modération.
- **Fiabilité** : ce que vous écrivez reste dans le champ si la connexion coupe. Si l'envoi échoue, « Message non envoyé » s'affiche avec un bouton « Réessayer ». Un message n'est jamais affiché comme envoyé avant d'être confirmé.
- **Temps réel et historique** : les nouveaux messages arrivent sans recharger la page. Les plus anciens se chargent quand on remonte.
- **Notifications** :
  - Elles passent par le service de notifications existant, au format « Julie · Anniversaire de Julie » suivi du texte. Un clic ouvre la discussion.
  - L'auteur n'est jamais notifié de son propre message.
  - Si plusieurs messages arrivent coup sur coup, ils sont regroupés en « 3 nouveaux messages dans … ».
  - Chacun peut régler ses notifications Messages sur « Toutes » ou « Désactivées ».
- **Recherche globale** : le texte des messages auxquels vous avez accès est trouvable, et un clic ouvre la discussion au bon message. Un message inaccessible n'apparaît jamais et n'est jamais compté.
- **Studio d'administration → Fonctionnalités → Messages** : activer ou désactiver globalement, autoriser ou non les photos, la modification et la suppression par l'auteur, les notifications et la recherche.

## Qui a accès
L'organisateur, ainsi que les invités ayant **accepté** et disposant d'un compte. Les invités en attente, ceux qui ont refusé et ceux qui ont été retirés n'ont pas accès. Les messages de quelqu'un qui perd son accès restent visibles. Changer l'identifiant de l'événement dans l'adresse ne donne jamais accès à une autre discussion : tout est contrôlé par la base de données et par le serveur.

## Détails techniques
- **Tables** :
  - `event_message` : event_id, author_user_id, author_invitation_id, message_type text|photo, text_content, photo_path, edited_at, deleted_at, deleted_by, created_at, updated_at.
  - `event_message_read_state` : une ligne par événement et par utilisateur, avec last_read_at.
  - `event_message_preferences` : notifications_enabled, true par défaut.
  - `event_message_moderation_log`.
  - Toutes ont leurs GRANT et des règles d'accès basées sur une fonction `can_access_event_messages(event_id)` : organisateur, ou invitation acceptée liée au compte, et extension active pour l'événement.
- Le temps réel est activé sur `event_message`. L'abonnement dans le navigateur est filtré par event_id et reste soumis aux mêmes règles d'accès.
- **`src/lib/messages.functions.ts`** (avec `requireSupabaseAuth`) : listMessages (pagination par curseur created_at, 30 par page), sendMessage, editMessage, deleteMessage, markRead, setPreference, unreadSummary. Chaque fonction revérifie l'accès et les réglages admin (stockés dans `extension_settings` ou `invitation_settings`).
- **Notifications** : insertion dans `notifications` côté serveur pour chaque participant autorisé, sauf l'auteur et ceux qui les ont désactivées. Si une notification Messages non lue de moins de 2 minutes existe déjà pour cet événement, elle est mise à jour (« N nouveaux messages dans … ») au lieu d'en créer une nouvelle.
- **Photos** : bucket privé existant `event-photos` sous `messages/{eventId}/`, compressées en WebP avec le pipeline photo existant, affichées par URL signée.
- **Fichiers** : `src/extensions/messages/` (config, MessagesWidget pour la carte, MessagesScreen pour la discussion, AdminSettings), déclarés dans le registre des extensions avec une ligne dans la table `extensions`. Une page `/app/events/$eventId/messages` reçoit les liens directs depuis les notifications et la recherche. Une source « messages » est ajoutée au Search Registry.
- L'ancien widget « Messages » (simples notes) est retiré au profit du nouveau plugin.

## Hors périmètre
Messages privés, groupes ou salons, audio, vidéo, vocaux, GIF, stickers, réactions, sondages, localisation, statut en ligne, indicateur de saisie, accusés de lecture individuels, transfert, réponses imbriquées, fichiers autres que les photos.
