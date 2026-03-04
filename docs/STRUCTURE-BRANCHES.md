# Guide des branches — develop puis feature

Structure à respecter :

```
main      ← production (stable)
  ↑
develop   ← intégration (toutes les features)
  ↑
feature/  ← chaque feature part de develop et se merge dans develop
```

---

## Ce que tu as fait jusqu’ici

Tu as fait le **login** dans une feature, mais cette feature part de **main**, pas de **develop**.

- **FAUX** si on veut la structure main ← develop ← feature : la feature doit partir de **develop**.
- **OK** pour le reste : le travail (login, admin, etc.) est dans une branche feature, pas directement dans main.

---

## Étapes à faire (dans l’ordre)

### Étape 1 : Créer la branche `develop` (une seule fois)

À faire dans le terminal :

```powershell
cd "c:\Users\asus\Desktop\pfe rfc\TicketManager"

git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

- **OUI** = tu as maintenant `main` et `develop` (develop = copie de main).
- **FAUX** = si tu crées une feature avant d’avoir créé `develop`.

---

### Étape 2 : Mettre ton travail actuel (login + admin) dans `develop`

Ton travail est sur **feature/login-form**. Il faut le faire arriver dans **develop** :

**Option A — Via GitHub (recommandé)**  
1. Va sur https://github.com/amelbenhazem/TicketManager  
2. **Pull request** : Base = **develop**, Compare = **feature/login-form**  
3. Crée la PR, vérifie que la CI est verte, puis **Merge**  
4. À partir de là, tout le travail login + admin est dans **develop**

**Option B — En local**

```powershell
git checkout develop
git pull origin develop
git merge feature/login-form
git push origin develop
```

- **OUI** = après ça, `develop` contient le login et l’admin. Les prochaines features partiront de `develop`.
- **FAUX** = merger feature/login-form directement dans **main** sans passer par develop (si tu veux respecter main ← develop ← feature).

---

### Étape 3 : Pour toute nouvelle feature (à partir de maintenant)

À faire **à chaque fois** que tu veux ajouter une nouvelle fonctionnalité :

```powershell
# 1. Aller sur develop et la mettre à jour
git checkout develop
git pull origin develop

# 2. Créer la feature À PARTIR DE develop
git checkout -b feature/nom-de-la-feature

# 3. Travailler, commiter, pousser
git add .
git commit -m "feat(quoi): description"
git push -u origin feature/nom-de-la-feature
```

- **OUI** = la feature part de **develop**.
- **FAUX** = faire `git checkout -b feature/xxx` à partir de **main** (sauf si tu n’utilises pas develop).

---

### Étape 4 : Quand la feature est terminée

Tu merges la feature **dans develop** (pas dans main) :

- **Sur GitHub** : Pull request **feature/nom** → **develop** (base = develop), puis Merge.
- **OUI** = merge feature → develop.
- **FAUX** = merge feature → main directement (pour le travail courant, on merge toujours dans develop).

---

### Étape 5 : Mettre en production (quand tu veux “released”)

Quand **develop** est prête à être déployée :

- **Sur GitHub** : Pull request **develop** → **main**, puis Merge.
- **OUI** = merge develop → main.
- **FAUX** = merger une feature directement dans main sans passer par develop.

---

## Récap OUI / FAUX

| Action | OUI | FAUX |
|--------|-----|------|
| Créer develop | À partir de main, une fois | Ne pas avoir de branche develop |
| Créer une feature | Toujours à partir de **develop** | À partir de main |
| Où merger la feature ? | Dans **develop** | Directement dans main |
| Mettre en prod | Merger **develop** → **main** | Merger une feature → main |

---

## En résumé pour toi

1. **Créer develop** (étape 1).  
2. **Mettre ton travail actuel dans develop** : PR feature/login-form → develop (étape 2).  
3. **Ensuite** : pour chaque nouvelle feature, partir de **develop** (étape 3), puis merger dans **develop** (étape 4).  
4. **Quand tu veux release** : merger **develop** → **main** (étape 5).

Comme ça, tu travailles bien avec **develop** d’abord, puis les **feature** qui partent de develop et se mergent dans develop.
