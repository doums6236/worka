# Worka

Plateforme de recrutement pour la Guinée et la sous-région Afrique de l'Ouest. App mobile candidat (swipe style Tinder), dashboard web recruteur, dashboard web admin.

[![CI](https://github.com/doums6236/worka/actions/workflows/ci.yml/badge.svg)](https://github.com/doums6236/worka/actions/workflows/ci.yml)
[![CodeQL](https://github.com/doums6236/worka/actions/workflows/codeql.yml/badge.svg)](https://github.com/doums6236/worka/actions/workflows/codeql.yml)

## Composants

- `apps/api` — Backend NestJS (REST + WebSocket) ✅ **Plans 1A-1D complets**
- `apps/mobile` — App candidat (Expo + React Native) — à venir (sous-projet #4)
- `apps/web-recruiter` — Dashboard recruteur (Next.js) — à venir (sous-projet #3)
- `apps/web-admin` — Dashboard admin (Next.js) — à venir (sous-projet #2)

## Stack technique

TypeScript partout. Backend NestJS + PostgreSQL (Prisma) + Redis. Frontends Next.js (web) et Expo (mobile). Hébergement Railway (backend) + Vercel (web). Paiement Orange Money via CinetPay. SMS via CinetPay. Storage Cloudflare R2. IA via Claude API. Chat temps réel via socket.io.

## Démarrage local

**Prérequis** : Node 20, pnpm 9, Docker Desktop.

```powershell
# Installation
pnpm install

# Postgres + Redis en Docker (Postgres sur 5433 pour éviter conflit avec un éventuel Postgres natif sur 5432)
pnpm db:up

# Configurer l'env du backend
Copy-Item apps/api/.env.example apps/api/.env
# Éditer apps/api/.env : générer JWT_ACCESS_SECRET et JWT_REFRESH_SECRET (64+ chars chacun)

# Migration DB
pnpm --filter @worka/api exec prisma migrate deploy

# Démarrer l'API
pnpm api:dev
```

L'API écoute sur http://localhost:3000.

- Healthcheck : `GET /api/v1/health` → `{"status":"ok","checks":{...}}`
- Auth flow test : `POST /api/v1/auth/send-otp` → consulter les logs du serveur pour le code OTP en mode mock → `POST /api/v1/auth/verify-otp` → JWT retourné.

## Tests

```powershell
pnpm --filter @worka/api lint
pnpm --filter @worka/api format:check
pnpm --filter @worka/api test
pnpm --filter @worka/api build
```

## Staging

Auto-déployé depuis la branche `main` vers Railway (Backend) + futurs Vercel (web).

URL staging : *configurée après provisioning Railway (voir [Plan 1D Task 5](docs/superpowers/plans/2026-05-13-worka-backend-1d-cicd-deploy.md)).*

Health endpoint : `/api/v1/health` (probé automatiquement par Railway pour auto-restart).

## Documentation

- [Spec produit + architecture globale](docs/superpowers/specs/2026-05-13-worka-platform-design.md)
- [Plans d'implémentation](docs/superpowers/plans/README.md)
- [Plan 1A — Foundation + Auth](docs/superpowers/plans/2026-05-13-worka-backend-1a-foundation-auth.md) ✅
- [Plan 1B — Core entités](docs/superpowers/plans/2026-05-13-worka-backend-1b-core-entities.md) ✅
- [Plan 1C — Paiement + Audit + Chat](docs/superpowers/plans/2026-05-13-worka-backend-1c-payment-audit-chat.md) ✅
- [Plan 1D — CI/CD + Deploy](docs/superpowers/plans/2026-05-13-worka-backend-1d-cicd-deploy.md) ✅

## Endpoints actifs (50 routes HTTP + WebSocket)

### Public
- `GET /api/v1/health` — état des services
- `GET /api/v1/domains` — référentiel des domaines (Tech, Finance, Santé, etc.)
- `GET /api/v1/skills?domainId=…` — compétences (filtre optionnel par domaine)
- `GET /api/v1/jobs` — offres publiées (filtres : status, country, domainId)
- `GET /api/v1/jobs/:id` — détail offre

### Authentification
- `POST /api/v1/auth/send-otp` — envoyer code SMS (rate-limité 3/min)
- `POST /api/v1/auth/verify-otp` — valider code et obtenir JWT
- `POST /api/v1/auth/refresh` — rafraîchir le token d'accès
- `GET /api/v1/me` — utilisateur courant (Bearer JWT)

### Candidat
- `GET|PATCH /api/v1/me/candidate-profile` — profil
- `GET|PUT /api/v1/me/candidate-profile/domains` — sélection des 3 domaines (style Netflix)
- `POST /api/v1/me/candidate-profile/cv-upload-url` — URL signée pour upload CV PDF
- `PATCH /api/v1/me/candidate-profile/cv` — enregistrer l'URL publique du CV uploadé
- `GET /api/v1/jobs/feed?limit=10` — stack de cartes à swiper (match scoring)
- `POST /api/v1/swipes` — enregistrer un swipe (left/right/saved)
- `GET /api/v1/swipes/saved` — liste des offres sauvegardées
- `POST /api/v1/applications` — postuler
- `GET /api/v1/applications/mine` — mes candidatures

### Recruteur
- `POST /api/v1/me/recruiter-profile/setup` — création entreprise + bascule du rôle
- `GET /api/v1/me/recruiter-profile` — profil recruteur
- `POST /api/v1/jobs` — créer une offre (draft)
- `PATCH /api/v1/jobs/:id` — éditer (drafts uniquement)
- `POST /api/v1/jobs/:id/submit` — soumettre à modération admin
- `GET /api/v1/jobs/mine` — mes offres
- `GET /api/v1/jobs/:jobId/applications` — candidatures pour mes offres
- `PATCH /api/v1/applications/:id/status` — update statut (pending/viewed/shortlisted/rejected/hired)

### Admin
- `GET|POST|PATCH|DELETE /api/v1/domains` — référentiel
- `GET|POST|PATCH|DELETE /api/v1/skills` — référentiel
- `GET /api/v1/companies` — entreprises (liste)
- `PATCH /api/v1/companies/:id/verify` — valider une entreprise (audit log)
- `POST /api/v1/jobs/:id/publish` — publier une offre (audit log)
- `POST /api/v1/jobs/:id/reject` — rejeter une offre (audit log)
- `GET|PUT /api/v1/pricing` — gérer tous les prix de la plateforme (audit log)

### Paiement (Orange Money via CinetPay)
- `POST /api/v1/payments/init` — initier un paiement (offre / abonnement / premium)
- `POST /api/v1/payments/webhook/cinetpay` — webhook signé HMAC-SHA256

### Chat (REST + WebSocket temps réel)
- `GET /api/v1/chat/conversations` — mes conversations
- `POST /api/v1/chat/conversations` — créer/récupérer une conversation
- `GET /api/v1/chat/conversations/:id/messages` — historique
- `POST /api/v1/chat/conversations/:id/messages` — envoyer (fallback HTTP)
- `POST /api/v1/chat/conversations/:id/read` — marquer lu
- **WebSocket** `/ws/chat` — événements `conversation:join`, `message:send`, `message:read`, `message:new`, `message:read` (broadcast aux participants)

## État du projet

| Phase | État |
|-------|------|
| Specs & plans | ✅ 100% |
| Backend (Plans 1A-1D) | ✅ 100% |
| Web admin (sous-projet #2) | ⏳ à venir |
| Web recruteur (sous-projet #3) | ⏳ à venir |
| App mobile candidat (sous-projet #4) | ⏳ à venir (prototype HTML existant) |
| IA premium (sous-projet #5) | ⏳ à venir |
| Pubs + Premium paiements (sous-projet #6) | ⏳ à venir |
