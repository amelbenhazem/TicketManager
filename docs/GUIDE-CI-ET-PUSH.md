# Guide pratique : CI, commit, push et branches

Ce guide répond à : **comment faire passer la CI**, **comment commit/push**, **comment pousser sur develop**, et **comment utiliser les branches / le merge**.

---

## 1. Comment commit et push tes changements

À chaque fois que tu as modifié des fichiers et que tu veux les enregistrer sur GitHub :

```powershell
cd "c:\Users\asus\Desktop\pfe rfc\TicketManager"

# Voir ce qui a changé
git status

# Tout ajouter au prochain commit
git add .

# Ou ajouter fichier par fichier
# git add backend/package.json frontend/app/page.tsx

# Créer le commit avec un message clair
git commit -m "feat(login): formulaire connexion + corrections CI"

# Pousser sur la branche actuelle (ex. develop ou feature/xxx)
git push origin develop
# ou, si c'est une nouvelle branche :
# git push -u origin feature/nom-de-la-feature
```

**En résumé :** `git add .` → `git commit -m "message"` → `git push origin <branche>`.

---

## 2. Comment faire passer la CI (tout vert sur GitHub)

La CI tourne **automatiquement** à chaque push (ou PR) sur `main` et `develop`. Elle fait :

- **Backend** : `npm ci` → `npm run lint` → `npm run build` → `npm run test`
- **Frontend** : `npm ci` → `npm run lint` → `npm run build`

### Avant de push : vérifier en local

Pour éviter un échec sur GitHub, lance la même chose en local :

```powershell
# Backend
cd backend
npm ci
npm run lint
npm run build
npm run test -- --passWithNoTests
cd ..

# Frontend
cd frontend
npm ci
npm run lint
npm run build
cd ..
```

Si tout passe en local, la CI a de fortes chances de passer aussi.

### Vérifier que la CI est verte sur GitHub

1. Va sur **https://github.com/amelbenhazem/TicketManager**
2. Onglet **Actions**
3. Clique sur le dernier workflow (ex. « CI »)
4. Tu dois voir **Backend (NestJS)** et **Frontend (Next.js)** avec une coche verte

Si un job est rouge : ouvre-le pour voir l'erreur (souvent lint ou build), corrige en local, commit, push.

---

## 3. Comment pousser tes modifs sur develop

Deux cas :

### Cas A : Tu es déjà sur la branche `develop`

```powershell
git checkout develop
git pull origin develop    # récupérer les dernières modifs
# ... faire tes changements ...
git add .
git commit -m "feat(quoi): description"
git push origin develop
```

### Cas B : Tu as travaillé sur une branche feature et tu veux tout mettre dans develop

**Option 1 — Merge en local**

```powershell
# Sur ta feature : tout commiter
git checkout feature/login-form   # ou le nom de ta branche
git add .
git commit -m "feat(quoi): description"
git push origin feature/login-form

# Puis merger dans develop
git checkout develop
git pull origin develop
git merge feature/login-form
git push origin develop
```

**Option 2 — Via GitHub (Pull Request)**

1. Push ta feature : `git push origin feature/nom-feature`
2. Sur GitHub : **Pull request** → Base = **develop**, Compare = **feature/nom-feature**
3. Vérifier que la CI est verte sur la PR
4. Cliquer sur **Merge pull request**

Dans les deux cas, après le merge, **develop** contient tes modifs.

---

## 4. Comment utiliser les branches et le merge

La structure est décrite en détail dans **[STRUCTURE-BRANCHES.md](./STRUCTURE-BRANCHES.md)**. Résumé :

| Étape | Commande / action |
|--------|-------------------|
| **Partir de develop** | `git checkout develop` puis `git pull origin develop` |
| **Créer une nouvelle feature** | `git checkout -b feature/nom-de-la-feature` |
| **Travailler et pousser la feature** | `git add .` → `git commit -m "..."` → `git push -u origin feature/nom-de-la-feature` |
| **Merger la feature dans develop** | En local : `git checkout develop` → `git merge feature/nom` → `git push origin develop` **ou** sur GitHub : PR feature → develop puis Merge |
| **Mettre en production** | Sur GitHub : PR **develop** → **main**, puis Merge |

En résumé : **feature** part de **develop**, se merge dans **develop** ; la **release** se fait en mergant **develop** dans **main**.

---

## Récap rapide

| Je veux… | Je fais… |
|----------|----------|
| Sauver et envoyer mon travail | `git add .` → `git commit -m "message"` → `git push origin <branche>` |
| Vérifier la CI avant de push | Lancer `npm run lint` et `npm run build` (et `npm run test` dans backend) dans `backend/` et `frontend/` |
| Voir si la CI est verte | GitHub → Actions → dernier workflow |
| Mettre ma feature dans develop | Merge en local (voir §3 Cas B) ou Pull Request feature → develop sur GitHub |
| Nouvelle feature | Partir de `develop`, créer `feature/xxx`, travailler, merger dans `develop` |

Pour le détail des branches (main / develop / feature), voir **docs/STRUCTURE-BRANCHES.md**.
