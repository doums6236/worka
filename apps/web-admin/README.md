# Worka — Console admin

Next.js 15 (App Router) + Tailwind 3 + React Query 5. Authentification via le backend Worka (phone + OTP), restreint au rôle `admin`.

## Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS 3 (palette alignée sur l'app mobile : `#1A91FF`)
- TanStack Query 5 pour la donnée serveur
- Zustand pour l'auth store
- lucide-react pour les icônes

## Démarrer en local

```bash
# Depuis la racine du repo
pnpm install
pnpm --filter @worka/web-admin dev
```

Par défaut le dashboard tourne sur http://localhost:3010 et tape sur l'API à `http://localhost:3000/api/v1`. Pour pointer vers le staging Railway :

```bash
NEXT_PUBLIC_API_BASE_URL=https://workaapi-production.up.railway.app/api/v1 \
  pnpm --filter @worka/web-admin dev
```

## Pages

| Route | Rôle | Description |
|---|---|---|
| `/login` | public | Saisie phone + code OTP à 6 chiffres. Redirige sur `/dashboard` si le rôle est `admin`, sinon `/login?denied=1`. |
| `/dashboard` | admin | KPIs, files de modération, catalogue, dernières offres. |
| `/domains` | admin | CRUD des domaines (icône emoji, nom FR/EN). |
| `/companies` | admin | Liste + vérification d'entreprises (filtre toutes/à vérifier/vérifiées). |
| `/jobs` | admin | Modération des offres (publier / rejeter). |
| `/users` | admin | _Bientôt_ — liste des utilisateurs avec suspension/changement de rôle. |
| `/audit` | admin | _Bientôt_ — journal des actions admin. |

## Auth

Tokens stockés dans `localStorage` (clés `worka.admin.access` / `worka.admin.refresh`). Refresh automatique sur 401. La page racine (`/`) redirige en fonction du rôle après hydratation.

## Endpoints API utilisés

Tous depuis le Nest backend existant — voir `apps/api/src/*/...controller.ts` :
- `POST /auth/send-otp`, `POST /auth/verify-otp`
- `GET /me`
- `GET /domains`, `POST /domains`, `PATCH /domains/:id`, `DELETE /domains/:id`
- `GET /companies`, `PATCH /companies/:id/verify`
- `GET /jobs`, `POST /jobs/:id/publish`, `POST /jobs/:id/reject`

## Déploiement

À configurer sur Vercel séparément des autres services Railway (le backend reste là où il est). Build standard Next.js : `pnpm --filter @worka/web-admin build && pnpm --filter @worka/web-admin start`.
