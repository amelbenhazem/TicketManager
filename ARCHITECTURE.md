# Architecture TicketManager

Architecture propre, scalable et prête pour DevOps.

---

## Principes

- **Séparer logique et UI** : hooks / services pour la logique, composants pour l’affichage.
- **DTO + validation** côté backend sur toutes les entrées.
- **Variables d’environnement** pour la config ; **aucun secret dans Git** (`.env` dans `.gitignore`, utiliser `.env.example` comme modèle).

---

## Backend (NestJS)

```
backend/src/
├── main.ts                 # Bootstrap : ValidationPipe, CORS, port depuis env
├── app.module.ts           # ConfigModule, Mongoose, AuthModule, guard global JWT
├── config/
│   ├── configuration.ts    # Configuration centralisée (env)
│   └── index.ts
├── common/
│   ├── decorators/         # @Public(), etc.
│   ├── filters/            # AllExceptionsFilter (réponses d’erreur uniformes)
│   └── guards/             # JwtAuthGuard
└── modules/
    └── auth/
        ├── auth.module.ts
        ├── auth.controller.ts   # POST /auth/login (@Public())
        ├── auth.service.ts     # Logique login, JWT
        ├── dto/
        │   ├── login.dto.ts     # class-validator
        │   └── index.ts
        └── strategies/
            └── jwt.strategy.ts
```

- **Config** : `ConfigModule` avec `configuration.ts` ; lecture depuis `.env` / `.env.local`.
- **Validation** : `ValidationPipe` global (whitelist, transform).
- **Auth** : JWT sur toutes les routes sauf celles marquées `@Public()` ; DTO `LoginDto` avec `class-validator`.
- **Secrets** : `JWT_SECRET`, `MONGODB_URI`, etc. uniquement dans les variables d’environnement (jamais committés).

Fichier modèle : `backend/.env.example`.

---

## Frontend (Next.js, App Router)

```
frontend/
├── app/
│   ├── globals.css         # Importe styles/ (variables, base, animations)
│   ├── styles/
│   │   ├── _variables.css  # Tokens (couleurs, etc.)
│   │   ├── _base.css       # Body, typo
│   │   └── _animations.css # @keyframes
│   ├── page.tsx            # Page login (layout + orchestration)
│   ├── dashboard/
│   └── forgot-password/
├── components/
│   └── login/
│       └── LoginForm.tsx   # UI pure (props, pas d’appels API)
├── hooks/
│   └── useLogin.ts         # Logique login : appel API, état loading/error, redirect
├── lib/
│   ├── env.ts              # NEXT_PUBLIC_* (ex. API URL)
│   └── api.ts              # Client HTTP (auth.login, erreurs)
└── .env.example            # NEXT_PUBLIC_API_URL (pas de secrets)
```

- **Logique vs UI** : `useLogin` appelle l’API et gère loading/erreur ; `LoginForm` reçoit tout en props.
- **API** : `lib/api.ts` utilise `env.apiUrl` ; pas de secrets côté client (uniquement `NEXT_PUBLIC_*`).
- **CSS** : variables dans `_variables.css`, base dans `_base.css`, animations dans `_animations.css`.

Fichier modèle : `frontend/.env.example`.

---

## DevOps & GitHub

- **CI** : `.github/workflows/ci.yml` — lint + build + test (backend + frontend) sur push/PR vers `main` / `develop`.
- **Branches** : `main` (prod), `develop` (intégration), `feature/*` (features).
- **Secrets** : à définir dans GitHub (Settings → Secrets) : `MONGODB_URI`, `JWT_SECRET`, etc. ; jamais dans le dépôt.
- **.gitignore** : `.env`, `.env.*`, `!.env.example` ; `node_modules/`, `dist/`, `.next/`, etc.

---

## Résumé des bonnes pratiques

| Règle | Backend | Frontend |
|-------|--------|----------|
| Logique vs UI | Services + DTOs | Hooks + lib/api, composants UI |
| Validation | class-validator + ValidationPipe | Contrôles HTML + messages API |
| Config / secrets | ConfigService + .env | NEXT_PUBLIC_* uniquement, .env.example |
| Pas de secrets dans Git | .env dans .gitignore | .env.local dans .gitignore |
