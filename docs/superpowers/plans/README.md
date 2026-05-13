# Worka — Plans d'implémentation

Ce dossier contient les plans détaillés d'implémentation, organisés par sous-projet et par phase.

## Sous-projet #1 — Backend API core

Le backend complet est découpé en 4 plans indépendants. Chacun produit un livrable testable de manière autonome.

| Plan | Document | Livrable | Tag git en fin |
|------|----------|----------|----------------|
| **1A** | [Foundation + Auth](2026-05-13-worka-backend-1a-foundation-auth.md) | API démarrable + `POST /auth/send-otp` + `POST /auth/verify-otp` + JWT + `GET /me` | `backend-1a-auth-done` |
| **1B** | [Core entités](2026-05-13-worka-backend-1b-core-entities.md) | Profils, domaines, skills, jobs, applications, swipes, feed | `backend-1b-entities-done` |
| **1C** | [Paiement + Audit + Chat](2026-05-13-worka-backend-1c-payment-audit-chat.md) | Webhook CinetPay + audit logs + WebSocket chat | `backend-1c-payment-chat-done` |
| **1D** | [CI/CD + Deploy Railway](2026-05-13-worka-backend-1d-cicd-deploy.md) | CI GitHub Actions verte + API en staging publique | `backend-1d-cicd-deploy-done` |

**Ordre obligatoire** : 1A → 1B → 1C → 1D. Chaque plan suppose que le précédent est complet et que le tag git associé est posé.

## Prochains sous-projets

À planifier après que sous-projet #1 soit complet :

- **#2 — Dashboard web admin** : modération, gestion prix, gestion domaines
- **#3 — Dashboard web recruteur** : poster offres, voir candidatures, chat
- **#4 — App mobile candidat** : onboarding, swipe, postuler, chat
- **#5 — IA premium** : amélioration CV, lettres, coaching, auto-apply
- **#6 — Pubs AdMob + Premium paiements** : intégration AdMob, flux abonnement candidat

Chaque sous-projet aura sa propre phase de brainstorming → spec → plans (potentiellement décomposés comme #1).

## Comment exécuter un plan

Deux options selon la skill choisie :

1. **subagent-driven-development** (recommandé) : un agent par tâche, review entre tâches, itération rapide
2. **executing-plans** : exécution par batch dans la même session avec checkpoints

L'en-tête de chaque plan référence la sous-skill à utiliser.

## Conventions

- Format **TDD strict** : chaque feature commence par un test rouge → on implémente le minimum → test vert → commit
- **Commits fréquents** : un commit par tâche minimum, conventional commits (`feat:`, `chore:`, `test:`, `docs:`, `fix:`)
- **Tags git** posés à la fin de chaque plan pour marquer les jalons
- **Pas de placeholders** dans les plans : chaque étape contient le code ou la commande exacte
