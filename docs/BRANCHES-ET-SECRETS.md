# Branches et Secrets GitHub — TicketManager

Guide pas à pas pour la branche **form login** et les **Secrets GitHub**.

---

## ✅ Étape 1 : Branche `feature/login-form` (fait)

- Branche créée : `feature/login-form`
- Commit poussé : `feat(login): formulaire connexion + auth backend (JWT, DTO, CORS)`
- Remote : `origin` → `https://github.com/amelbenhazem/TicketManager.git`

---

## Étape 2 : Ouvrir une Pull Request (à faire dans le navigateur)

1. Va sur : **https://github.com/amelbenhazem/TicketManager**
2. Tu devrais voir un bandeau jaune : **"feature/login-form had recent pushes"** avec un bouton **"Compare & pull request"**.
3. Clique sur **"Compare & pull request"**.
4. **Base** : `main` ← **Compare** : `feature/login-form`.
5. Titre suggéré : `Feature: formulaire de login + auth backend`.
6. Clique sur **"Create pull request"**.
7. Une fois la CI verte (si tu as des Actions), clique sur **"Merge pull request"** puis **"Confirm merge"**.

---

## Étape 3 : Secrets GitHub (Variables secrètes)

Les secrets servent à **ne jamais mettre en clair** dans le dépôt : mots de passe, URI MongoDB, clé JWT, etc. Ils sont utilisés par la **CI/CD** (GitHub Actions) ou un déploiement.

### 3.1 Où les ajouter

1. Ouvre : **https://github.com/amelbenhazem/TicketManager**
2. Onglet **Settings** (du dépôt, pas ton compte).
3. Menu de gauche : **Secrets and variables** → **Actions**.

### 3.2 Créer un secret

1. Clique sur **"New repository secret"**.
2. **Name** : le nom exact (en majuscules, comme dans le code).
3. **Secret** : la valeur (tu ne pourras plus la revoir après).

### 3.3 Secrets utiles pour TicketManager

| Name           | Quand l’ajouter        | Exemple de valeur (à ne pas commiter) |
|----------------|------------------------|----------------------------------------|
| `MONGODB_URI`  | CI e2e ou déploiement  | `mongodb://user:pass@host:27017/db`   |
| `JWT_SECRET`   | CI ou déploiement      | Une longue chaîne aléatoire (ex. 64 caractères) |

Pour générer un `JWT_SECRET` fort (PowerShell) :

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### 3.4 Utilisation dans un workflow (exemple)

Dans `.github/workflows/ci.yml`, pour un job qui a besoin de MongoDB ou JWT :

```yaml
env:
  MONGODB_URI: ${{ secrets.MONGODB_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

Tu n’es pas obligé d’ajouter ces secrets tout de suite si ta CI ne fait que **lint + build** sans base de données.

---

## Récap

| Action                         | Où / Comment                                      |
|--------------------------------|---------------------------------------------------|
| Branche form login             | ✅ Créée et poussée : `feature/login-form`        |
| Pull Request                   | GitHub → Compare & pull request → Merge           |
| Ajouter un secret              | Repo → Settings → Secrets and variables → Actions |
| Utiliser un secret dans la CI  | `${{ secrets.NOM_DU_SECRET }}` dans le workflow   |

---

Repo : **https://github.com/amelbenhazem/TicketManager**
