# Worka — Spec produit et architecture globale

**Date** : 2026-05-13
**Statut** : Draft v1 — en attente de validation
**Auteur** : doums6236

## 1. Vision et contexte

Worka est une plateforme de recrutement mobile-first pour la Guinée et la sous-région Afrique de l'Ouest (Sénégal, Mali, Côte d'Ivoire, Burkina Faso, etc.). L'app mobile permet aux candidats de "swiper" les offres d'emploi (à la manière de Tinder), tandis que recruteurs et admin gèrent le contenu depuis des dashboards web.

Le marché cible :
- **Candidats** : population urbaine équipée d'un smartphone, principalement francophone, avec un usage massif d'Orange Money et un faible usage d'email
- **Recruteurs** : PME, grands groupes, et agences de recrutement de la sous-région
- **Admin** : équipe Worka qui modère, gère les prix, et anime la marketplace

## 2. Périmètre fonctionnel (MVP v1)

### 2.1 App mobile candidat

- Onboarding : 3 splash screens illustrés présentant Worka
- Inscription par numéro de téléphone + OTP SMS
- Détection automatique du pays/région via IP (Cloudflare `CF-IPCountry`) avec fallback GPS
- Sélection initiale obligatoire de 3 domaines préférés (style Netflix) parmi un référentiel géré par l'admin (Tech, Finance, Santé, Marketing, Éducation, Logistique, Commerce, Médias, Bâtiment, Énergie, etc.)
- Upload du CV au format PDF (max 5 Mo)
- Stack de cartes "swipe" avec offres filtrées et triées par : domaine choisi, géolocalisation, skills, comportement passé (apprentissage des swipes)
- Actions sur une carte : swipe droite (postuler), swipe gauche (passer), étoile (sauvegarder pour plus tard), tap (flip pour voir détails)
- 1 publicité AdMob affichée tous les 5 swipes (candidats gratuits uniquement)
- Chat temps réel avec le recruteur après application
- Notifications push (offre vue, mise en shortlist, nouveau message, suggestion d'offre)
- Premium IA payant (abonnement mensuel via Orange Money) :
  - Amélioration et correction du CV
  - Génération de lettre de motivation personnalisée par offre
  - Coaching carrière (suggestions de skills à acquérir, formations)
  - **Auto-Apply** : l'IA postule automatiquement aux offres dont le score de match dépasse un seuil défini par le candidat (configurable par domaine, désactivable à tout moment)

### 2.2 Dashboard web recruteur

- Inscription par numéro de téléphone + OTP, validation manuelle par l'admin avant publication d'offres
- Profil entreprise (nom, secteur, logo, localisation, description)
- Création et publication d'offres (titre, description, domaine, skills requis, fourchette de salaire en GNF/XOF, type de contrat, deadline)
- Paiement par offre + abonnement mensuel via Orange Money (montants définis par l'admin)
- Tableau de bord des candidatures (par offre, filtrable par statut)
- Consultation et téléchargement des CV des candidats qui ont postulé (logué dans l'audit trail)
- Chat temps réel avec les candidats
- Statistiques par offre : vues, candidatures, taux de shortlist

### 2.3 Dashboard web admin

- Inscription par numéro de téléphone + OTP + activation TOTP (Google Authenticator) obligatoire
- Vue d'ensemble (KPIs : utilisateurs actifs, offres publiées, candidatures, revenus mensuels)
- Modération : file d'attente des recruteurs à valider, file d'attente des offres à approuver, signalements
- Gestion du référentiel : domaines, skills, types de contrat
- Gestion des prix : prix par offre, plans d'abonnement recruteur, prix premium candidat
- Capacité de poster des offres directement (rôle hybride pour amorcer la plateforme et gérer les grands comptes)
- Logs d'audit complets (qui a fait quoi, quand, depuis quelle IP)
- Sous-permissions : `admin.moderator` (modération seulement) vs `admin.super` (gestion prix et utilisateurs)

### 2.4 Hors périmètre MVP (v2+)

- Multi-langues (peul, soussou, malinké) — v1 = français uniquement
- Application iOS/Android native (autre que via Expo)
- Intégration avec d'autres moyens de paiement (MTN MoMo, Wave, cartes bancaires)
- Tests psychométriques et vidéo CV
- Marketplace de formations
- Programme de parrainage

## 3. Architecture technique

### 3.1 Stack

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Mobile | Expo + React Native + TypeScript | Cross-platform iOS/Android, OTA updates, écosystème mature, partage de types avec le backend |
| Web (recruteur + admin) | Next.js 15 (App Router) + TypeScript + Tailwind CSS | SSR pour SEO des offres publiques, deux dashboards dans le même monorepo, déploiement Vercel natif |
| Backend | NestJS + TypeScript | Architecture modulaire, dépendance injection, validation/auth built-in, WebSocket via socket.io |
| Base de données | PostgreSQL 16 + Prisma ORM | Relations strictes pour jobs/applications/users, JSON pour champs flexibles, ACID pour paiements |
| Cache et files | Redis | Sessions, throttling OTP, queue BullMQ pour SMS, IA, push, auto-apply |
| Storage objets | Cloudflare R2 (compatible S3) | Pas de frais d'egress, 10 Go gratuits, hébergement européen |
| CDN et WAF | Cloudflare | DDoS protection, WAF, bot management, géolocalisation IP |
| SMS OTP | CinetPay (couverture Guinée et sous-région) | Un seul prestataire pour SMS + paiement, simplification contractuelle |
| Paiement | CinetPay (Orange Money Guinée v1) | Webhook signé HMAC, sandbox disponible |
| Push notifications | Firebase Cloud Messaging | Gratuit, supporte iOS et Android |
| IA | Claude API (Anthropic) | Bonne performance en français, prompt caching pour réduire les coûts |
| Pubs mobile | Google AdMob | Standard de l'industrie, format banner et interstitial |
| Erreurs | Sentry (plan gratuit) | Stack traces, breadcrumbs, releases |
| Analytics | PostHog (self-hosted ou cloud free) | Open source, événements custom |

### 3.2 Hébergement

| Environnement | Service | Coût estimé |
|---------------|---------|-------------|
| Backend API (staging + prod) | Railway (hobby puis pro) | 5 à 20 $/mois |
| Postgres et Redis | Railway addons | inclus |
| Web recruteur et admin | Vercel (hobby puis pro) | gratuit puis 20 $/mois |
| Storage CV et logos | Cloudflare R2 | gratuit jusqu'à 10 Go |
| DNS et CDN | Cloudflare | gratuit |
| SMS + Paiement | CinetPay | pay-as-you-go |

**Coût mensuel estimé MVP** : 10 à 30 $/mois pour les 1000 premiers utilisateurs.

### 3.3 Topologie

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE (CDN + WAF + DDoS)            │
└─────────────────────────────────────────────────────────────┘
            │              │              │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
    │ App mobile   │ │ Web recru- │ │ Web admin │
    │ (Expo + RN)  │ │ teur       │ │ (Next.js) │
    │              │ │ (Next.js)  │ │           │
    └───────┬──────┘ └─────┬──────┘ └────┬──────┘
            │              │              │
            └──────────────┼──────────────┘
                           │  HTTPS + JWT
                ┌──────────▼───────────┐
                │  Backend NestJS      │
                │  - REST API          │
                │  - WebSocket (chat)  │
                │  - Workers BullMQ    │
                └──┬───────┬───────┬───┘
                   │       │       │
            ┌──────▼─┐ ┌──▼──┐ ┌──▼──────────┐
            │Postgres│ │Redis│ │ Cloudflare R2│
            └────────┘ └─────┘ └──────────────┘

Services externes :
- CinetPay (SMS + Orange Money)
- Firebase Cloud Messaging (push)
- Claude API (IA premium)
- AdMob (pubs candidats)
- Sentry + PostHog (monitoring)
```

### 3.4 Structure monorepo

```
worka/
├── apps/
│   ├── api/                  NestJS backend
│   ├── mobile/               Expo app candidat
│   ├── web-recruiter/        Next.js dashboard recruteur
│   └── web-admin/            Next.js dashboard admin
├── packages/
│   ├── shared-types/         Interfaces TypeScript partagées
│   ├── ui-kit/               Composants web réutilisables
│   └── eslint-config/        Config lint partagée
├── docs/
│   └── superpowers/
│       └── specs/            Specs produit (ce document)
├── .github/
│   └── workflows/            CI/CD GitHub Actions
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

Le monorepo utilise PNPM workspaces pour partager les types entre frontend et backend (notamment les DTO de l'API), ce qui élimine les erreurs de désynchronisation client/serveur.

## 4. Sécurité

L'application doit être "redoutable, sécurisée, fluide" selon l'objectif du commanditaire. Dix couches de sécurité sont prévues.

### 4.1 Réseau
- HTTPS uniquement, TLS 1.3, en-tête HSTS sur tous les domaines
- Cloudflare en front : DDoS protection, WAF avec règles managées (OWASP Core Ruleset), bot management
- Rate limiting : 100 requêtes/min par IP, 30 requêtes/min par utilisateur authentifié

### 4.2 Authentification
- Téléphone + OTP SMS (6 chiffres, expiration 5 min, max 3 tentatives, throttling 3 SMS par numéro toutes les 15 min pour limiter les coûts et le spam)
- JWT : access token de 15 minutes, refresh token de 30 jours stocké en cookie httpOnly sur web et en secure storage sur mobile
- Admin : OTP SMS **+ TOTP (Google Authenticator) obligatoire** comme seconde couche

### 4.3 Autorisation
- Trois rôles : `candidate`, `recruiter`, `admin`
- Sous-permissions admin : `admin.moderator` vs `admin.super`
- Chaque endpoint API vérifie le rôle et les permissions via guards NestJS
- RBAC explicite dans le code, pas de logique d'autorisation dispersée

### 4.4 API
- Validation stricte avec Zod sur chaque endpoint (corps, query, params)
- Pas de SQL injection : Prisma ORM en queries paramétrées exclusivement
- Sanitization XSS sur tous les contenus user-generated (descriptions d'offres, profils, messages chat)
- Upload de CV : type MIME PDF strict, magic bytes vérifiés, scan antivirus ClamAV via worker async, max 5 Mo
- Idempotency keys obligatoires sur tous les endpoints qui créent des transactions

### 4.5 Paiement
- Webhook CinetPay vérifié par signature HMAC sur chaque callback
- Pas de PCI-DSS nécessaire (Orange Money, pas de cartes manipulées)
- Double-entry accounting : chaque transaction reflétée dans la table `transactions` avec statut, idempotency_key, et provider_ref
- Aucun secret côté client : toutes les clés API stockées en variables d'environnement backend

### 4.6 Données
- PII chiffrée au repos (numéros de téléphone hashés pour les recherches, données sensibles via pgcrypto)
- Backups Postgres chiffrés, rétention 30 jours
- Soft delete par défaut (champ `deleted_at`), suppression dure uniquement sur demande explicite
- Logs d'accès aux CV : table d'audit dédiée (recruteur X a téléchargé le CV du candidat Y à telle heure)

### 4.7 Frontend
- Mobile : certificate pinning vers l'API backend (empêche les attaques MITM)
- Web : CSP strict (pas de inline script), cookies `SameSite=Strict` et `Secure`, headers `X-Frame-Options: DENY`
- Aucun secret dans le code client (les clés Firebase Web sont publiques par design, le reste reste backend)

### 4.8 Anti-abus
- Nouveau recruteur : mode "pending review" jusqu'à validation admin manuelle
- Quotas d'offres par recruteur selon le plan d'abonnement
- Quotas d'applications candidat (max 50/jour pour les comptes normaux, 100/jour pour les premium) pour bloquer les bots
- Modération automatique : blacklist de mots-clés (arnaques type "salaire 50M GNF, virement requis")
- Auto-Apply : limité à 20 applications/jour par candidat, scoring strict, log clairement marqué `applied_via=auto_apply` pour transparence

### 4.9 Audit et journalisation
- Table `audit_logs` qui trace toutes les actions sensibles : connexion admin, modification de prix, validation de recruteur, suppression de compte, accès à un CV
- Erreurs centralisées dans Sentry
- Logs applicatifs structurés en JSON, conservés 30 jours sur Railway

### 4.10 Opérationnel
- Secrets stockés dans les variables d'environnement Railway et Vercel (jamais dans le code)
- Rotation des clés API tous les 90 jours
- `.gitignore` strict avec `git-secrets` en pre-commit hook pour bloquer les fuites accidentelles
- Principe du moindre privilège sur tous les comptes cloud (CinetPay, Cloudflare, etc.)

## 5. Modèle de données

Les entités principales et leurs relations. Le schéma complet (Prisma) sera produit lors du plan d'implémentation du sous-projet #1 (Backend).

```
User                        utilisateur tous rôles
  id (uuid), phone (unique), role[candidate|recruiter|admin],
  status[active|suspended|deleted], country_code, created_at, last_seen_at

CandidateProfile            profil candidat
  user_id (FK), first_name, last_name, cv_url, summary, location,
  is_premium, premium_until, ai_credits_remaining,
  auto_apply_enabled, auto_apply_min_match_score

RecruiterProfile            profil recruteur
  user_id (FK), company_id (FK), role_in_company, verified_at

AdminProfile                profil admin
  user_id (FK), permissions[admin.moderator|admin.super],
  totp_secret, totp_enabled

Company                     entreprise
  id, name, sector, logo_url, country, city,
  verified_by_admin_id, plan[free|monthly|yearly]

Domain                      référentiel des secteurs
  id, name_fr, name_en, icon, parent_id (hiérarchie)

UserDomain                  3 domaines choisis par le candidat
  user_id (FK), domain_id (FK), priority (1-3)

Skill                       référentiel des compétences
  id, name, domain_id (FK)

Job                         offre d'emploi
  id, company_id (FK), posted_by_user_id (FK), title, description,
  domain_id (FK), skills[FK], salary_min, salary_max, currency,
  location, country, type[CDI|CDD|stage|freelance],
  status[draft|pending|published|closed|expired],
  deadline, view_count, application_count, published_at

Swipe                       historique des swipes
  id, candidate_id (FK), job_id (FK), direction[left|right|saved],
  swiped_at, match_score_at_swipe

Application                 candidature
  id, job_id (FK), candidate_id (FK),
  status[pending|viewed|shortlisted|rejected|hired],
  cover_letter_url, applied_via[manual|auto_apply],
  match_score, recruiter_viewed_at, applied_at

Conversation                conversation chat
  id, candidate_id (FK), recruiter_id (FK), job_id (FK), last_message_at

Message                     message chat
  id, conversation_id (FK), sender_id (FK), content,
  attachment_url, read_at, sent_at

Transaction                 transaction paiement
  id, user_id (FK), type[recruiter_offer|recruiter_sub|candidate_premium],
  amount, currency, status[pending|success|failed|refunded],
  provider[orange_money], provider_ref, idempotency_key, created_at

Subscription                abonnement actif
  id, user_id (FK), plan, started_at, expires_at, auto_renew

PricingConfig               prix configurables par l'admin
  key (unique), value, currency, updated_by, updated_at

AdImpression                impression publicitaire
  id, candidate_id (FK), ad_unit, shown_at, clicked

AuditLog                    journal d'audit
  id, actor_id (FK), action, target_type, target_id,
  payload_json, ip, user_agent, at

Notification                notification utilisateur
  id, user_id (FK), type, title, body, data_json,
  read_at, sent_at
```

## 6. Flux utilisateurs clés

### 6.1 Onboarding candidat

```
Splash 1 → Splash 2 → Splash 3 →
  Saisie téléphone → Réception OTP SMS → Validation OTP →
  Prénom et nom → Localisation (auto-détectée, modifiable) →
  Sélection 3 domaines (style Netflix) →
  Upload CV (optionnel à cette étape, peut être différé) →
  Home avec stack de cartes prête
```

### 6.2 Swipe et candidature

```
Cartes préchargées (10 cartes en cache mémoire) →
  Calcul match_score local au préchargement →
  Affichage de la carte courante →
  Action utilisateur :
    swipe droite  → POST /applications (status pending) →
                    Notification recruteur →
                    Carte suivante
    swipe gauche  → POST /swipes (direction left) →
                    Carte suivante
    étoile        → POST /swipes (direction saved) →
                    Reste sur place (option visible)
    tap           → Flip carte → affichage détails
  Incrémentation compteur swipes →
  Si compteur % 5 == 0 ET pas premium :
    Affichage interstitial AdMob → reprise
  Si stack < 3 cartes restantes :
    Préchargement de 10 nouvelles cartes en arrière-plan
```

### 6.3 Auto-Apply IA (candidat premium)

```
Worker BullMQ "auto-apply" scanne les nouvelles offres toutes les 5 min →
  Pour chaque candidat premium avec auto_apply_enabled = true :
    Pour chaque nouvelle offre dans ses domaines préférés :
      Calcul du match_score (domaines × skills × géo × historique swipes) →
      Si match_score >= auto_apply_min_match_score :
        Vérification : pas déjà postulé →
        Vérification : pas swipé gauche →
        Vérification : quota journalier < 20 →
        Claude API génère lettre de motivation personnalisée →
        Création Application (applied_via = auto_apply) →
        Notification au candidat ("L'IA a postulé pour toi à [titre]")
```

### 6.4 Chat temps réel

```
Connexion WebSocket socket.io →
  Handshake authentifié par JWT →
  Le client rejoint les salles "conversation:{id}" pour ses conversations actives →
  Envoi message :
    Persistence DB →
    Broadcast à la salle →
    Si destinataire offline (pas connecté à la socket) :
      Fallback FCM push notification
  Marqué lu :
    PATCH /messages/:id/read →
    Broadcast "read_receipt" à la salle
```

### 6.5 Paiement recruteur

```
Recruteur clique "Publier l'offre" →
  Backend crée Transaction (status pending) avec idempotency_key →
  Redirection vers CinetPay (Orange Money) →
  Recruteur paie via OM →
  CinetPay POST /webhooks/cinetpay (signé HMAC) →
  Backend vérifie la signature HMAC →
  Si valide : Transaction.status = success, Job.status = pending (modération admin) →
  Email + notification au recruteur →
  Apparaît dans la file de modération admin
```

### 6.6 Modération admin

```
Nouvelle entité (recruteur ou offre) → File de modération →
  Admin consulte → Valide ou rejette avec motif →
  Si validée :
    Entité status = published
    Si offre : push notification aux candidats dont les domaines matchent
    Email au recruteur
  Si rejetée :
    Email avec motif au recruteur
  Action loguée dans AuditLog
```

## 7. Découpage en sous-projets

Le projet est trop large pour une seule spec d'implémentation. Découpage en six sous-projets, chacun avec sa propre spec détaillée et son propre plan d'implémentation.

| # | Sous-projet | Durée estimée (1 dev senior) | Bloque |
|---|-------------|------------------------------|--------|
| 1 | **Backend API core** : auth phone+OTP, users, domains, skills, jobs, applications, paiement, audit logs | 4 à 6 semaines | Tout le reste |
| 2 | **Web admin** : modération, gestion prix, gestion domaines, capacité poster offres | 2 à 3 semaines | Web recruteur, mobile |
| 3 | **Web recruteur** : profil entreprise, post d'offres, vue candidatures | 2 à 3 semaines | Mobile (besoin d'offres) |
| 4 | **App mobile candidat** : onboarding, swipe, postuler, chat, CV upload, notifications | 4 à 5 semaines | — |
| 5 | **IA Premium** : amélioration CV, lettres de motivation, coaching, auto-apply | 2 à 3 semaines | — |
| 6 | **Pubs AdMob + Premium paiements** : intégration AdMob, flux abonnement candidat | 1 à 2 semaines | — |

**Total MVP** : 15 à 22 semaines (4 à 5 mois) pour un dev senior fullstack, ou 8 à 12 semaines à 2-3 devs en parallèle après le sous-projet 1.

L'ordre 1 → 2 → 3 → 4 → 5 → 6 est imposé par les dépendances (le backend doit exister avant tout, l'admin avant que les recruteurs ne s'inscrivent, etc.).

## 8. Environnement de test en ligne

Pour valider l'app avec de vrais utilisateurs en Guinée dès le sous-projet 4 terminé :

| Composant | Service | URL pattern |
|-----------|---------|-------------|
| Backend API | Railway (staging) | `https://worka-api-staging.up.railway.app` |
| Web recruteur | Vercel | `https://worka-recruiter-staging.vercel.app` |
| Web admin | Vercel | `https://worka-admin-staging.vercel.app` |
| App mobile (test) | Expo Go + EAS Update | QR code partageable |
| Postgres | Railway addon | URL privée |
| Redis | Railway addon | URL privée |
| Storage | Cloudflare R2 bucket `worka-uploads-staging` | — |
| SMS | CinetPay sandbox | mode mock en dev local |
| Paiement | CinetPay sandbox | OM test mode |

**Workflow CI/CD** : push sur branche `main` → auto-deploy Railway (API) + Vercel (web). Branche `production` séparée pour le déploiement final.

**Distribution test mobile** : EAS Update (gratuit jusqu'à 1000 utilisateurs) pour pousser des mises à jour à des testeurs, ou APK Android partagé via WhatsApp.

## 9. Risques et points d'attention

1. **Couverture SMS en Guinée** : à valider avec CinetPay que la livraison OTP est fiable sur tous les opérateurs locaux (Orange Guinée, MTN Guinée) et dans les pays cibles de la sous-région. Plan B : intégrer un second prestataire (Africa's Talking) pour le routing OTP de secours.

2. **Coûts SMS** : si l'inscription est trop élevée, les coûts SMS peuvent exploser. Throttling 3 OTP par numéro / 15 min indispensable dès le jour 1.

3. **Adoption du paiement OM** : l'expérience d'achat in-app via Orange Money est moins fluide qu'une carte bancaire. Prévoir une UX qui guide le candidat pas à pas.

4. **Modération à l'échelle** : si la plateforme grandit vite, la modération manuelle des recruteurs ne tiendra pas. Prévoir dès la v2 un système de validation automatique partielle (vérification SIRET local, croisement avec données publiques).

5. **Coût IA premium** : les appels Claude API ont un coût. Mettre en place le prompt caching et un quota strict de `ai_credits_remaining` par candidat premium pour éviter les abus.

6. **Auto-Apply éthique** : les recruteurs doivent pouvoir filtrer les candidatures auto-apply s'ils le souhaitent (champ `applied_via` visible dans le dashboard). Cela évite que la feature dégrade la qualité perçue de la marketplace.

7. **Performance fluidité mobile** : préchargement de 10 cartes en mémoire, lazy loading des images via Cloudflare Images, optimistic UI sur les swipes (l'API confirme en arrière-plan).

## 10. Prochaines étapes

1. Validation de cette spec par le commanditaire.
2. Commit du document sur le repo GitHub `doums6236/worka`.
3. Démarrage du sous-projet **#1 — Backend API core** via la skill `superpowers:writing-plans` qui produira un plan d'implémentation détaillé étape par étape.
