# TicketManager - Concept et Cas d'utilisation

## 1) Concept du projet

TicketManager est une application web de gestion de tickets d'incident.

Le but est de permettre a une organisation de:
- centraliser les demandes de support
- suivre le cycle de vie des tickets
- affecter rapidement les tickets aux techniciens
- notifier les utilisateurs en temps reel sur les changements importants

Le projet est compose de:
- un backend NestJS (API REST + WebSocket)
- un frontend Next.js (interfaces Admin, Technicien, Client)
- une base MongoDB (users, tickets)

---

## 2) Roles metier

Le systeme gere 3 roles:

- `admin`
  - gestion des utilisateurs
  - vue globale de tous les tickets
  - affectation des tickets
  - changement de statut (y compris cloture)

- `technician`
  - visualise les tickets qui lui sont assignes
  - fait avancer le statut des tickets assignes
  - ne peut pas reaffecter ni cloturer (selon les regles metier actuelles)

- `client`
  - cree des tickets
  - suit ses propres tickets
  - recoit les mises a jour de statut

---

## 3) Cas d'utilisation principaux

## UC-01 - Connexion utilisateur
- Acteur: Admin / Technicien / Client
- Description: l'utilisateur se connecte avec email + mot de passe
- Resultat: un token JWT est delivre et utilise pour les appels API + WebSocket

## UC-02 - Creation de ticket
- Acteur: Client
- Description: le client cree un ticket (titre, description, categorie, priorite, pieces jointes)
- Resultat:
  - ticket en statut `open`
  - notifications WebSocket envoyees a l'admin et au createur

### Regles UC-02 - Enums metier (etat actuel)

- **Priorite (`priority`)**
  - `low`
  - `medium`
  - `high`
  - valeur par defaut: `medium`

- **Categorie (`category`)**
  - `reseau`
  - `logiciel`
  - `materiel`
  - `autre`
  - valeur par defaut: `autre`

Note:
- la valeur `critical` n'est pas encore implementee dans le schema actuel
- si necessaire, elle peut etre ajoutee dans une evolution metier (schema + UI + filtres + regles SLA)

### Regles UC-02 - Pieces jointes (etat actuel)

- **Types de fichiers acceptes (MIME):**
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`

- **Taille maximale:**
  - `10 Mo` par fichier

- **Nombre maximal:**
  - `10` fichiers par upload (endpoint `POST /tickets/attachments/upload`)

- **Stockage:**
  - stockage distant sur **Cloudinary**
  - dans `ticket.attachments`, on stocke uniquement les URLs (`secure_url`)
  - pas de stockage local serveur, pas de GridFS MongoDB dans l'implementation actuelle

- **Comportement en cas d'erreur:**
  - fichier trop volumineux -> erreur 400
  - type non autorise -> erreur 400
  - Cloudinary non configure -> erreur 400
  - si upload invalide, la creation du ticket peut continuer sans piece jointe si aucune URL valide n'est fournie

## UC-03 - Consultation des tickets
- Acteur: Tous les roles (avec vues differentes)
- Description:
  - Admin: tous les tickets
  - Technicien: tickets assignes
  - Client: ses propres tickets
- Resultat: affichage filtre selon role et droits

## UC-04 - Affectation d'un ticket
- Acteur: Admin
- Description: l'admin assigne un ticket a un technicien
- Resultat:
  - ticket mis a jour (`assignedTo`)
  - notifications envoyees au technicien assigne, au client proprietaire et aux admins

## UC-04b - Reaffectation d'un ticket
- Acteur: Admin
- Description: l'admin change le technicien deja assigne a un ticket
- Preconditions:
  - ticket existant
  - ticket non cloture (`status != closed`)
  - nouveau technicien valide
- Regles:
  - la reaffectation d'un ticket `closed` est interdite (rouvrir d'abord le ticket)
  - l'admin est le seul role autorise a modifier `assignedTo`
- Resultat:
  - `assignedTo` est mis a jour
  - notifications envoyees:
    - au nouveau technicien
    - a l'ancien technicien
    - au client proprietaire
    - aux admins

## UC-05 - Changement de statut
- Acteur: Admin ou Technicien assigne
- Description: mise a jour du statut (`open`, `in_progress`, `resolved`, `closed`)
- Les transitions autorisees sont definies en section **5.1**.
- Resultat:
  - ticket mis a jour
  - notifications envoyees aux parties concernees (client proprietaire, technicien assigne, admins)

## UC-06 - Gestion des utilisateurs
- Acteur: Admin
- Description: creer, modifier, supprimer des comptes
- Resultat: administration complete des utilisateurs

### Regles UC-06 - Clarifications techniques

- **Changement de role d'un utilisateur existant**
  - Oui, l'admin peut changer le role (`client`, `technician`, `admin`) d'un utilisateur existant.

- **Suppression d'un technicien avec tickets assignes**
  - **Decision retenue (deploiement initial): Option A**
  - suppression interdite tant que des tickets sont assignes au technicien
  - objectif: eviter les tickets orphelins et limiter la logique de compensation
  - impact implementation backend:
    - verifier l'existence de tickets avec `assignedTo = technicianId`
    - si oui, refuser la suppression (erreur metier explicite)
    - si non, autoriser la suppression

## UC-07 - Deconnexion securisee
- Acteur: Tous
- Description: deconnexion depuis le menu
- Resultat:
  - token supprime du localStorage
  - socket temps reel fermee proprement

---

## 4) Concept temps reel (WebSocket)

Le frontend maintient une connexion WebSocket avec le backend (`/notifications`).

Quand un evenement metier arrive, le backend emet immediatement:
- `ticket.created`
- `ticket.assigned`
- `ticket.status_changed`

Le frontend:
- met a jour les listes sans refresh manuel
- affiche un toast visuel (`react-hot-toast`)
- joue un son de notification

Points importants:
- reconnexion automatique active
- gestion des erreurs de connexion (`connect_error`)
- nettoyage de la socket au logout et en cas de token invalide

---

## 5) Regles de notification (actuelles)

- `ticket.created`:
  - admin
  - createur du ticket

- `ticket.assigned`:
  - admin
  - client proprietaire
  - technicien assigne
  - ancien technicien si reaffectation
  - **Note:** dans l'etat actuel, `ticket.assigned` couvre a la fois l'affectation initiale et la reaffectation (UC-04b). Un event dedie `ticket.reassigned` pourra etre introduit plus tard pour une semantique plus explicite.

- `ticket.status_changed`:
  - admin
  - client proprietaire
  - technicien assigne

---

## 5.1) Regles de statut - qui peut faire quoi ?

Pour eviter toute ambiguite, les transitions de statut sont:

| Transition | Admin | Technicien |
|---|---|---|
| `open` -> `in_progress` | Oui | Oui (si assigne) |
| `in_progress` -> `resolved` | Oui | Oui (si assigne) |
| `resolved` -> `closed` | Oui | Non |
| Retour en arriere (`resolved` -> `in_progress`, `in_progress` -> `open`, etc.) | Oui | Non |

Regles metier appliquees:
- Le technicien peut modifier uniquement le statut des tickets qui lui sont assignes.
- Le technicien ne peut pas modifier `assignedTo`.
- Le technicien ne peut pas cloturer un ticket (`closed`).
- L'admin peut modifier l'affectation et le statut, y compris la cloture et les retours en arriere.

---

## 5.2) Cycle de vie du ticket (formalisation)

Workflow nominal:

`open` -> `in_progress` -> `resolved` -> `closed`

Questions de transition:

- **Peut-on passer de `open` -> `resolved` directement ?**
  - **Admin:** Oui (autorise dans l'etat actuel)
  - **Technicien:** Oui, uniquement si le ticket lui est assigne
  - **Recommendation metier:** en production, preferer imposer `open` -> `in_progress` avant `resolved` pour une meilleure tracabilite

- **Peut-on rouvrir un ticket `closed` ?**
  - **Admin:** Oui, c'est possible via retour en arriere (`closed` -> `in_progress` ou `open`)
  - **Technicien:** Non
  - **Note:** cette flexibilite est volontaire actuellement pour permettre les corrections; elle peut etre verrouillee plus tard selon les regles SLA

---

## 6) Valeur ajoutee du projet

- gain de temps operationnel
- reduction des oublis de traitement
- meilleure visibilite sur l'etat des incidents
- communication instantanee entre les acteurs
- base solide pour evolutions futures (SLA, historique, reporting, priorisation automatique)

---

## 7) Evolutions recommandees

- centre de notifications persistant (notifications lues/non lues en base)
- filtres avances et recherche full-text
- escalade automatique selon delais SLA
- dashboards metier (KPI tickets ouverts, temps moyen de resolution)
- notifications email/SMS en complement du temps reel
ou