# Worka

Plateforme de recrutement pour la Guinée et la sous-région Afrique de l'Ouest. App mobile candidat (swipe style Tinder), dashboard web recruteur, dashboard web admin.

## Composants

- `apps/api` — Backend NestJS (REST + WebSocket)
- `apps/mobile` — App candidat (Expo + React Native)
- `apps/web-recruiter` — Dashboard recruteur (Next.js)
- `apps/web-admin` — Dashboard admin (Next.js)
- `packages/shared-types` — Types TypeScript partagés

## État

🟡 **Phase de design**. La spec produit et architecture est en cours.

- [Spec produit et architecture](docs/superpowers/specs/2026-05-13-worka-platform-design.md)

## Stack technique

TypeScript partout. Backend NestJS + PostgreSQL (Prisma) + Redis. Frontends Next.js (web) et Expo (mobile). Hébergement Railway (backend) + Vercel (web). Paiement Orange Money via CinetPay. SMS via CinetPay. Storage Cloudflare R2. IA via Claude API.

## Démarrage

À venir une fois la spec validée et le sous-projet #1 (Backend API) initialisé.
