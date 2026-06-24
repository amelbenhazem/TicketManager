# Release 1 — Solution logicielle et infrastructurelle

## Sprint 1 : Conception et Développement

**Projet :** TicketManager — Plateforme de gestion des incidents IT (RFC)  
**Thème du sprint :** Conception et développement de la solution (Backend + Frontend + fonctionnalités principales)

---

## 1. Objectif du Sprint 1

Concevoir et développer le **socle applicatif MVP** de TicketManager en trois axes :

| Axe | Objectif |
|-----|----------|
| **Backend** | API REST NestJS, authentification JWT, RBAC à 3 rôles, persistance MongoDB, notifications WebSocket |
| **Frontend** | Application Next.js avec interfaces dédiées Client, Technicien et Administrateur |
| **Fonctionnalités principales** | Cycle de vie complet des tickets, gestion utilisateurs (admin), notifications temps réel, statistiques |

### Résultat attendu

À l'issue du sprint, le système permet :

- **Authentification** — connexion sécurisée par email/mot de passe, token JWT, redirection selon le rôle ;
- **Client** — créer, consulter, filtrer et modifier ses tickets (avec pièces jointes) ;
- **Technicien** — consulter les tickets assignés et mettre à jour leur statut ;
- **Administrateur** — gérer les utilisateurs (CRUD), superviser tous les tickets, assigner aux techniciens, consulter les statistiques ;
- **Notifications** — alertes persistantes en base + push temps réel (WebSocket) à chaque événement ticket.

### Périmètre infrastructure Sprint 1

| Élément | Sprint 1 | Sprint ultérieur |
|---------|----------|------------------|
| MongoDB (Docker Compose local) | ✅ | — |
| Backend NestJS containerisé | ✅ | — |
| Frontend Next.js containerisé | ✅ | — |
| Cloudinary (pièces jointes) | ✅ | — |
| CI GitHub Actions (lint, build, tests) | ✅ | — |
| Terraform / Azure Stack Hub | — | Sprint 3 |
| Pipeline Azure DevOps complet | — | Sprint 3 |

---

## 2. Backlog Sprint 1

### 2.1 Epic — Backend (API REST NestJS, JWT, RBAC)

| ID | User Story | Priorité | Livrable technique | Statut |
|----|-----------|----------|-------------------|--------|
| S1-B01 | Authentification JWT (login + profil) | Must | `POST /auth/login`, `GET /auth/me`, bcrypt, Passport | ✅ |
| S1-B02 | RBAC global sur toutes les routes | Must | `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@Public()` | ✅ |
| S1-B03 | CRUD utilisateurs (admin uniquement) | Must | `UsersModule` — `GET/POST/PATCH/DELETE /users` | ✅ |
| S1-B04 | Cycle de vie tickets avec règles par rôle | Must | `TicketsModule` — scope client/technicien/admin | ✅ |
| S1-B05 | Historique des modifications (audit trail) | Should | `TicketHistoryEntry[]` dans le schéma Ticket | ✅ |
| S1-B06 | Upload pièces jointes (Cloudinary) | Must | `POST /tickets/attachments/upload` | ✅ |
| S1-B07 | Notifications persistantes + WebSocket | Must | `NotificationsModule`, `TicketsNotificationsGateway` | ✅ |
| S1-B08 | Statistiques tickets et utilisateurs | Should | `GET /tickets/stats`, `GET /users/stats` | ✅ |
| S1-B09 | Documentation API Swagger | Could | `/api` (Swagger UI, hors production) | ✅ |
| S1-B10 | Script de seed (données de démo) | Should | `npm run seed` — 5 users, 4 tickets | ✅ |

### 2.2 Epic — Frontend (Next.js)

| ID | User Story | Priorité | Livrable technique | Statut |
|----|-----------|----------|-------------------|--------|
| S1-F01 | Page de connexion avec redirection par rôle | Must | `/login`, hook `useLogin` | ✅ |
| S1-F02 | Garde d'authentification par espace | Must | `useRequireAuth` — layouts Client / Technicien / Admin | ✅ |
| S1-F03 | Espace Client (dashboard, tickets, profil) | Must | `/dashboard/*` | ✅ |
| S1-F04 | Création ticket + upload fichiers | Must | `/dashboard/tickets/new` → API upload Cloudinary | ✅ |
| S1-F05 | Espace Technicien (dashboard, tickets assignés) | Must | `/technician/*` | ✅ |
| S1-F06 | Espace Admin (users CRUD, tickets, stats) | Must | `/admin` — Chart.js, modales assignation | ✅ |
| S1-F07 | Cloche de notifications temps réel | Must | `NotificationsBell` + Socket.IO | ✅ |
| S1-F08 | Client API typé (erreurs 401, déconnexion auto) | Must | `lib/api.ts`, `lib/realtime.ts` | ✅ |

### 2.3 Epic — Fonctionnalités métier (transversal)

| ID | User Story | Priorité | Backend | Frontend | Statut |
|----|-----------|----------|---------|----------|--------|
| S1-01 | Je m'authentifie et accède à mon espace selon mon rôle | Must | S1-B01, S1-B02 | S1-F01, S1-F02 | ✅ |
| S1-02 | En tant que client, je crée un ticket avec pièces jointes | Must | S1-B04, S1-B06 | S1-F04 | ✅ |
| S1-03 | En tant que client, je consulte et filtre mes tickets | Must | S1-B04 | `/dashboard/tickets` | ✅ |
| S1-04 | En tant que client, je modifie un ticket au statut « Ouvert » | Should | S1-B04, S1-B05 | `/dashboard/tickets/[id]/edit` | ✅ |
| S1-05 | En tant que technicien, je traite mes tickets assignés | Must | S1-B04 | S1-F05 | ✅ |
| S1-06 | En tant qu'admin, je gère les utilisateurs (CRUD) | Must | S1-B03 | S1-F06 | ✅ |
| S1-07 | En tant qu'admin, j'assigne un ticket à un technicien | Must | S1-B04, S1-B07 | `AssignTicketModal` | ✅ |
| S1-08 | En tant qu'admin, je consulte les statistiques | Should | S1-B08 | Graphiques admin | ✅ |
| S1-09 | Je reçois des notifications à chaque événement ticket | Must | S1-B07 | S1-F07 | ✅ |

### 2.4 Backlog détaillé (vue consolidée)

| ID | User Story | Priorité | Backend | Frontend | Statut |
|----|-----------|----------|---------|----------|--------|
| S1-01 | En tant qu'utilisateur, je m'authentifie par email/mot de passe et reçois un JWT | Must | `POST /auth/login`, `GET /auth/me` | `/login` | ✅ Fait |
| S1-02 | En tant que système, j'applique le RBAC (client / technicien / admin) sur chaque route | Must | `JwtAuthGuard`, `RolesGuard`, guards tickets | Redirection post-login par rôle | ✅ Fait |
| S1-03 | En tant que client, je crée un ticket (titre, catégorie, priorité, description, pièces jointes) | Must | `POST /tickets`, upload Cloudinary | `/dashboard/tickets/new` | ✅ Fait |
| S1-04 | En tant que client, je consulte et filtre mes tickets | Must | `GET /tickets` (scope client) | `/dashboard/tickets` | ✅ Fait |
| S1-05 | En tant que client, je modifie un ticket au statut « Ouvert » | Should | `PATCH /tickets/:id` (règles client) | `/dashboard/tickets/[id]/edit` | ✅ Fait |
| S1-06 | En tant que client, je consulte mon profil | Should | `GET /auth/me` | `/dashboard/profil` | ✅ Fait |
| S1-07 | En tant que technicien, je consulte les tickets qui me sont assignés | Must | `GET /tickets` (scope technicien) | `/technician/tickets` | ✅ Fait |
| S1-08 | En tant que technicien, je mets à jour le statut d'un ticket assigné | Must | `PATCH /tickets/:id` (règles technicien) | Modal / liste technicien | ✅ Fait |
| S1-09 | En tant qu'admin, je gère les utilisateurs (CRUD) | Must | `/users/*` (admin only) | `/admin` — section utilisateurs | ✅ Fait |
| S1-10 | En tant qu'admin, je consulte tous les tickets, filtre et recherche | Must | `GET /tickets` (scope admin) | `/admin` — section tickets | ✅ Fait |
| S1-11 | En tant qu'admin, j'assigne un ticket à un technicien | Must | `PATCH /tickets/:id` (assignedTo) | `AssignTicketModal` | ✅ Fait |
| S1-12 | En tant qu'admin, je consulte les statistiques (utilisateurs / tickets) | Should | `GET /users/stats`, `GET /tickets/stats` | Graphiques Chart.js | ✅ Fait |
| S1-13 | En tant qu'utilisateur, je reçois des notifications (persistantes + WebSocket) | Must | `NotificationsModule`, gateway WS | `NotificationsBell` | ✅ Fait |
| S1-14 | En tant que système, j'enregistre l'historique des modifications d'un ticket | Should | `TicketHistoryEntry[]` | Affiché dans les modales détail | ✅ Fait |
| S1-15 | En tant que développeur, je dispose de la documentation API (Swagger) | Could | `/api` (Swagger UI) | — | ✅ Fait |

### Hors périmètre Sprint 1 (sprints ultérieurs)

| ID | Fonctionnalité | Sprint cible |
|----|---------------|--------------|
| S2-01 | Réinitialisation mot de passe (forgot password) | Sprint 2 |
| S2-02 | Modification du profil utilisateur (self-service) | Sprint 2 |
| S3-01 | Déploiement Azure Stack Hub (Terraform) | Sprint 3 |
| S3-02 | Pipeline CI/CD complet (Azure DevOps) | Sprint 3 |

---

## 3. Architecture technique

```
┌─────────────────┐     REST (JWT)      ┌─────────────────┐
│  Frontend       │ ◄──────────────────► │  Backend        │
│  Next.js 16     │     WebSocket         │  NestJS 11      │
│  (port 3000)    │ ◄──────────────────► │  (port 3001)    │
└─────────────────┘                       └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  MongoDB 8      │
                                          └─────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Cloudinary     │
                                          │  (pièces jointes)│
                                          └─────────────────┘
```

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 | Interfaces par rôle, client API typé |
| Backend | NestJS 11, Mongoose 9 | API REST, guards JWT/RBAC, WebSocket |
| Base de données | MongoDB 8 | Persistance User, Ticket, Notification |
| Stockage fichiers | Cloudinary | Upload pièces jointes tickets |
| Auth | JWT (Passport) + bcrypt | Authentification stateless |
| RBAC | 3 rôles : `client`, `technician`, `admin` | Contrôle d'accès par endpoint et par champ |

---

## 4. Diagrammes UML (Sprint 1)

| Diagramme | Fichier | Description |
|-----------|---------|-------------|
| Contexte statique | `docs/diagrammes/diagramme-contexte-statique.drawio` | Acteurs externes, MongoDB, Cloudinary |
| Cas d'utilisation (général) | `docs/diagrammes/cas-utilisation-general.drawio` | Vue complète du système |
| **Cas d'utilisation Sprint 1** | `docs/diagrammes/cas-utilisation-sprint1.drawio` | Périmètre raffiné du sprint |
| Classes | `docs/diagrammes/diagramme-classes.drawio` | Modèle de données Mongoose |
| Séquence — Authentification | `docs/diagrammes/seq-authentification.drawio` | `POST /auth/login` |
| Séquence — Création ticket | `docs/diagrammes/seq-creation-ticket.drawio` | Création + notification admin |
| Séquence — Assignation ticket | `docs/diagrammes/seq-assignation-ticket.drawio` | Assignation + notification technicien |

Ouvrir les fichiers `.drawio` avec [diagrams.net](https://app.diagrams.net) ou l'extension Draw.io intégrée à VS Code.

---

## 5. Interfaces réalisées (Frontend)

| Route | Rôle | Fonctionnalité |
|-------|------|----------------|
| `/login` | Public | Authentification JWT, redirection par rôle |
| `/dashboard` | Client | Tableau de bord — statistiques tickets |
| `/dashboard/tickets` | Client | Liste, filtres, détail ticket |
| `/dashboard/tickets/new` | Client | Création ticket + upload pièces jointes |
| `/dashboard/tickets/[id]/edit` | Client | Modification ticket (statut ouvert) |
| `/dashboard/profil` | Client | Consultation profil |
| `/technician` | Technicien | Tableau de bord — statistiques |
| `/technician/tickets` | Technicien | Tickets assignés, mise à jour statut |
| `/admin` | Admin | Dashboard, CRUD utilisateurs, gestion tickets, stats |

---

## 6. API REST principale (Backend)

| Méthode | Endpoint | Rôle(s) | Description |
|---------|----------|---------|-------------|
| POST | `/auth/login` | Public | Connexion, retourne JWT |
| GET | `/auth/me` | Tous | Profil utilisateur courant |
| GET/POST/PATCH/DELETE | `/users/*` | Admin | Gestion utilisateurs |
| GET/POST/PATCH/DELETE | `/tickets/*` | Selon RBAC | Cycle de vie tickets |
| POST | `/tickets/attachments/upload` | Tous (auth) | Upload Cloudinary |
| GET/PATCH | `/notifications/*` | Tous | Notifications in-app |

Documentation interactive : `http://localhost:3001/api` (Swagger, hors production).

---

## 7. Critères d'acceptation Sprint 1

- [x] Un client peut créer un ticket et le retrouver dans sa liste
- [x] Un admin reçoit une notification temps réel à la création d'un ticket
- [x] Un admin peut assigner un ticket ; le technicien reçoit une notification
- [x] Un technicien peut changer le statut d'un ticket assigné (sauf « Fermé »)
- [x] Les routes API refusent les accès non autorisés (401/403)
- [x] Les interfaces sont séparées par rôle avec garde d'authentification
- [x] Les pièces jointes sont uploadées vers Cloudinary avant création/modification du ticket
- [x] Les diagrammes UML sont alignés avec le code implémenté

---

## 8. Démarrage local

```bash
# MongoDB
docker compose up mongodb -d

# Backend (port 3001)
cd backend && npm ci && cp .env.example .env && npm run seed && npm run start:dev

# Frontend (port 3000)
cd frontend && npm ci && cp .env.example .env && npm run dev
```

**Comptes de démonstration (seed) :**

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@rfc.com | Admin123! | admin |
| tech1@rfc.com | Tech123! | technicien |
| client1@rfc.com | Client123! | client |

---

## 9. Traçabilité diagrammes ↔ code

| Cas d'utilisation | Module backend | Page frontend |
|-------------------|---------------|---------------|
| S'authentifier | `AuthModule` | `/login` |
| Créer un ticket | `TicketsModule.create()` | `/dashboard/tickets/new` |
| Assigner un ticket | `TicketsService.update()` | `AssignTicketModal` |
| Gérer les utilisateurs | `UsersModule` | `/admin` |
| Notifications temps réel | `TicketsNotificationsGateway` | `NotificationsBell` |
