# Analyse & besoins (fonctionnels / non fonctionnels) — TicketManager

## 1. Contexte & objectifs
TicketManager est une application web full-stack (Next.js + NestJS) permettant :
- l’authentification d’utilisateurs via JWT,
- la gestion de tickets (création, liste, modification selon rôle),
- la diffusion d’événements en temps réel (websocket/socket.io) lors de changements de tickets,
- l’upload de pièces jointes via Cloudinary.

Le système est conçu pour fonctionner en mode MongoDB « single node / standalone » en développement (sans transactions multi-documents), ce qui influence la stratégie de cohérence UI (reconciliation côté front).

## 2. Hypothèses techniques (d’après le code)
- Frontend : Next.js App Router (fichiers sous `frontend/app/*`), code client majoritairement en `use client`.
- Backend : NestJS, JWT via `@nestjs/jwt` + `passport-jwt`.
- JWT : expiration par défaut configurée à `24h`.
- Token côté navigateur : stocké dans `localStorage` sous `access_token` et `user_role`.
- Realtime : websocket namespace Socket.IO `'/notifications'`.
- Pièces jointes : upload Cloudinary retournant des `secure_url` stockées en `ticket.attachments`.
- MongoDB : standalone en dev (pas de transactions multi-docs).

## 3. Acteurs
- **Admin** : gère tous les tickets, peut modifier statut + affectation, gère les utilisateurs (notamment suppression sous contrainte).
- **Technicien** : modifie uniquement les tickets qui lui sont assignés et ne peut changer que le statut (pas l’affectation).
- **Client** : voit ses propres tickets (selon garde/contrôleur), ne modifie pas les tickets.

## 4. Contrats & APIs principales

### 4.1 Auth
Endpoints (backend) :
- `POST /auth/login` (public) : retourne `access_token`, `expiresIn`, `role`.
- `GET /auth/me` : retourne le profil (auth requis via guard JWT).

JWT payload attendu :
- `sub` : identifiant user
- `email`
- `role`

Règle d’expiration :
- `expiresIn` configuré via `jwt.expiresIn` (valeur par défaut : `24h`).

Comportement côté front :
- en cas de `401` sur une requête API authentifiée, le front :
  - coupe le realtime,
  - purge `access_token` et `user_role`,
  - redirige vers `/login`.

### 4.2 Tickets (HTTP)
Controller : `Controller('tickets')` avec guard JWT global.

Endoints (d’après le code trouvé) :
- `GET /tickets`
  - pagination via `page`, `limit`
  - liste dépendante du rôle :
    - Admin : `findAll(page, limit)`
    - Technicien : `findAllByAssignedTo(req.user.id, page, limit)`
    - Client : `findAllByUser(req.user.id, page, limit)`
- `GET /tickets/:id`
  - détail d’un ticket sous contrainte (guard / logique métier)
- `POST /tickets/attachments/upload`
  - upload de fichiers vers Cloudinary
  - retourne `{ urls: string[] }` (les `secure_url`)
- `POST /tickets` (création ticket) (si présent dans `TicketsController`)
- `PATCH /tickets/:id`
  - guard `TicketOwnerOrAdminGuard` (admin ou propriétaire/assigné technicien selon règle)

Schéma ticket (Mongo) :
- `attachments: string[]` (URLs Cloudinary / `secure_url`)
- `status`, `category`, `priority`, `userId`, `assignedTo`

### 4.3 Mise à jour / règles métier sur tickets
- Admin :
  - peut modifier `status` et `assignedTo`
  - émission d’événements realtime si :
    - `assignedTo` change (`ticket.assigned`)
    - `status` change (`ticket.status_changed`)
- Technicien :
  - ne peut modifier que si `assignedTo` correspond à son `user.id`
  - ne peut modifier que `status` (interdit de modifier `assignedTo`)
  - interdit clôture (`status === closed`) (admin uniquement)
  - émission d’événement realtime si `status` change
- Client :
  - pas autorisé à modifier (erreurs `ForbiddenException`)

### 4.4 Users (contrôle suppression)
Exemple de règle métier :
- Suppression d’un technicien : interdite si le technicien a des tickets assignés
- Le backend lève `ForbiddenException` (donc **HTTP 403**).
- Le message métier est renvoyé au front via le body JSON (`body.message`), et affiché directement (toast).

## 5. Realtime (Socket.IO)

### 5.1 Namespace & authentification
- Namespace : `'/notifications'`
- Auth :
  - token récupéré via `client.handshake.auth?.token` (ou header `Authorization: Bearer ...`)
  - vérification JWT côté gateway (`jwtService.verify`)
  - si invalidation : déconnexion socket

### 5.2 Rooms
- Room utilisateur : `user:${userId}`
- Room rôle :
  - `role:${role}` (ex: admin)

### 5.3 Événements émis
- `ticket.created`
  - payload : `{ ticket, actorUserId?, timestamp }`
- `ticket.assigned`
  - payload : `{ ticket, actorUserId?, previousAssignedTo, timestamp }`
- `ticket.status_changed`
  - payload : `{ ticket, actorUserId?, previousStatus, timestamp }`

### 5.4 Stratégie de cohérence UI (option 1 — reconciliation côté front)
En MongoDB standalone (sans transactions multi-docs), l’atomicité « update ticket + notification » ne peut pas être garantie.
Le front compense par :
- refresh silencieux déclenché par les events realtime,
- polling léger périodique sur les écrans listant des tickets,
- refresh lors du retour en avant-plan de l’onglet.

## 6. Besoins fonctionnels

### 6.1 Authentification & navigation
1. Permettre aux utilisateurs de se connecter via `POST /auth/login`.
2. Stocker `access_token` et `user_role` côté navigateur.
3. Protéger les routes API sensibles via `JwtAuthGuard`.
4. Respecter le rôle (`admin`, `technician`, `client`) dans le backend (guards / contrôleurs).
5. Sur expiration JWT (ou token invalide), rediriger vers `/login` :
   - sur erreur `401` des requêtes API,
   - sur erreur `connect_error` realtime liée à l’auth.
6. Avoir une page de login accessible via `/login`.

### 6.2 Gestion des tickets
1. Lister les tickets selon le rôle :
   - Admin : tous les tickets (paginated).
   - Technicien : tickets assignés.
   - Client : tickets créés par l’utilisateur.
2. Créer un ticket avec les champs :
   - `title` (requis)
   - `description` (optionnel)
   - `category` (optionnel)
   - `priority` (optionnel)
   - `attachments` (optionnel : array d’URLs Cloudinary)
3. Mettre à jour un ticket via `PATCH /tickets/:id` en appliquant :
   - admin : statut + affectation autorisés
   - technicien : statut seul autorisé, seulement si ticket assigné
   - client : modification interdite
4. Clôturer un ticket :
   - interdit pour technicien
   - autorisé pour admin
5. Déclencher les notifications realtime après changement :
   - `ticket.assigned` en cas de changement d’affectation
   - `ticket.status_changed` en cas de changement de statut
6. Afficher sur les écrans listant des tickets les mises à jour via realtime + reconciliation.

### 6.3 Upload de pièces jointes
1. Permettre l’upload multi-fichiers via `POST /tickets/attachments/upload`.
2. Appliquer des contraintes :
   - max fichiers : `10`
   - max taille fichier : `10 Mo` (10 * 1024 * 1024)
   - types autorisés : `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf` (d’après le service)
3. Retourner au front une liste d’URLs `secure_url`.
4. Stocker les `secure_url` dans `ticket.attachments`.

### 6.4 Gestion des utilisateurs (ex: suppression technicien)
1. Autoriser l’accès admin aux endpoints utilisateurs (guards + rôles).
2. Interdire la suppression d’un technicien si des tickets sont assignés.
3. Renvoyer un message métier clair (HTTP 403 + `message`) afin que le front l’affiche directement.

## 7. Besoins non fonctionnels

### 7.1 Sécurité
1. JWT :
   - secret stocké côté serveur (via config/env),
   - expiration contrôlée (`24h`),
   - vérification stricte (pas de `ignoreExpiration`).
2. Ne pas exposer de secrets dans les sources.
3. CORS :
   - autoriser uniquement les origins nécessaires (config présente dans `configuration.ts`).
4. Messages d’erreur :
   - permettre l’affichage du message métier (`body.message`) côté front (éviter les messages génériques basés sur `statusText`).
5. Websocket :
   - déconnexion si token manquant/invalidé.

### 7.2 Fiabilité & cohérence
1. En environnement MongoDB standalone :
   - ne pas supposer l’atomicité multi-docs pour « update + notification »
   - utiliser une stratégie de reconciliation front :
     - polling léger (ex : 30 secondes),
     - rafraîchissement à la réactivation de l’onglet,
     - refresh silencieux sur événements.
2. Assurer la résilience face aux pertes de messages realtime (notamment en arrière-plan ou en cas de coupure websocket).

### 7.3 Performance
1. Pagination serveur pour `GET /tickets` (limite contrôlée).
2. Upload :
   - upload en streaming vers Cloudinary,
   - limiter taille/type pour éviter surcharge.
3. Minimiser les re-renders :
   - côté front, mode `silent` pour rafraîchir sans afficher de loader lourd.

### 7.4 Scalabilité
1. Le système realtime doit gérer un nombre croissant de sockets :
   - rooms par utilisateur et rôle pour réduire le fan-out,
   - namespace dédié `'/notifications'`.
2. La liste tickets doit rester exploitable via pagination (pas de chargement non borné).

### 7.5 Observabilité & debug
1. Journalisation des événements de connexion/déconnexion socket côté gateway (présente via `Logger`).
2. Faciliter le diagnostic des erreurs d’auth realtime (événements `connect_error` côté front affichent une toast dans certains cas).

## 8. Besoins d’environnement
1. Environnements minimaux recommandés :
   - Node.js 18+,
   - NestJS 10+,
   - Next.js 14+.
2. MongoDB :
   - en dev : standalone (transactions multi-docs indisponibles),
   - en prod : recommandation (optionnelle) d’envisager replica set pour davantage de garanties transactionnelles si nécessaire.

## 9. Critères d’acceptation (exemples)
1. Connexion :
   - après login, la redirection dépend du rôle :
     - `admin` → `/admin`
     - `technician` → `/technician`
     - `client` → `/dashboard`
2. Expiration JWT :
   - après expiration (simulateur), la prochaine action protégée (ou event websocket) redirige vers `/login`.
3. Règle métier 403 :
   - suppression d’un technicien assigné renvoie 403 et affiche exactement le message métier.
4. Realtime/reconciliation :
   - en cas de perte de notif, l’état de la liste tickets se resynchronise dans un délai borné (polling + visibility).
5. Upload Cloudinary :
   - types autorisés acceptés, autres rejetés avec erreur métier,
   - le ticket conserve les `secure_url` retournées.

