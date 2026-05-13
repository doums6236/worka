# Worka Backend 1D — CI/CD + Railway Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint + Prettier + a GitHub Actions CI pipeline that runs lint, type-check, unit tests, and e2e tests on every push; provision Railway services (Postgres, Redis, API) for a staging environment that auto-deploys from `main`; verify the live `/health` endpoint over the public URL.

**Architecture:** GitHub Actions workflow with a Postgres + Redis service container so e2e tests can run in CI. Railway deployment via Dockerfile (or Railpack auto-detect) with environment variables set in the Railway dashboard. Migrations run automatically as a pre-deploy step (Railway `start` command).

**Tech Stack:** GitHub Actions, ESLint 9 flat config, Prettier 3, Dockerfile (multi-stage), Railway CLI (optional).

**Prerequisite:** Plan 1C complete and tagged `backend-1c-payment-chat-done`.

---

## File Structure (additions)

```
worka/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── codeql.yml
├── apps/api/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── eslint.config.mjs
│   └── .prettierrc.json
└── railway.json                 # optional, lets us pin build config
```

---

## Task 1: ESLint 9 flat config + Prettier

**Files:**
- Create: `apps/api/eslint.config.mjs`
- Create: `apps/api/.prettierrc.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install deps**

```powershell
pnpm --filter @worka/api add -D eslint@^9 @eslint/js typescript-eslint prettier eslint-config-prettier
```

- [ ] **Step 2: `apps/api/eslint.config.mjs`**

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/require-await': 'warn',
    },
  },
  { ignores: ['dist', 'node_modules', 'prisma/migrations'] },
);
```

- [ ] **Step 3: `apps/api/.prettierrc.json`**

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true
}
```

- [ ] **Step 4: Update scripts in `apps/api/package.json`**

```json
"scripts": {
  "lint": "eslint src --max-warnings 0",
  "format": "prettier --write \"src/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.ts\""
}
```

- [ ] **Step 5: Run lint, fix all issues**

```powershell
pnpm --filter @worka/api lint
```
Expected: 0 errors. Fix anything found (likely missing return types or `any` warnings — promote to `unknown` where safe).

- [ ] **Step 6: Run format**

```powershell
pnpm --filter @worka/api format
```
Then commit:

```powershell
git add apps/api
git commit -m "chore(lint): add eslint 9 flat config and prettier"
```

---

## Task 2: Dockerfile for the API

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/api/.dockerignore`

- [ ] **Step 1: `apps/api/.dockerignore`**

```
node_modules
dist
.git
.env
.env.*
coverage
*.log
```

- [ ] **Step 2: `apps/api/Dockerfile` (multi-stage, monorepo-aware)**

```dockerfile
# syntax=docker/dockerfile:1.7

# ----- stage 1: deps -----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

# ----- stage 2: build -----
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @worka/api exec prisma generate
RUN pnpm --filter @worka/api build

# ----- stage 3: runtime -----
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=deps /repo/node_modules /repo-node_modules
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

- [ ] **Step 3: Build and smoke-test locally**

```powershell
docker build -f apps/api/Dockerfile -t worka-api:local .
docker run --rm -p 3000:3000 --env-file apps/api/.env worka-api:local
```
(Use the local Postgres/Redis or override env vars to point at Docker hosts.)
Expected: `Worka API listening on http://localhost:3000`. `curl http://localhost:3000/api/v1/health` returns ok.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/Dockerfile apps/api/.dockerignore
git commit -m "chore(docker): add multi-stage Dockerfile for the API"
```

---

## Task 3: GitHub Actions CI (lint, test, e2e)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: worka
          POSTGRES_PASSWORD: worka_ci
          POSTGRES_DB: worka
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U worka"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://worka:worka_ci@localhost:5432/worka
      REDIS_URL: redis://localhost:6379
      NODE_ENV: development
      JWT_ACCESS_SECRET: ${{ secrets.CI_JWT_ACCESS_SECRET }}
      JWT_REFRESH_SECRET: ${{ secrets.CI_JWT_REFRESH_SECRET }}
      JWT_ACCESS_TTL: 15m
      JWT_REFRESH_TTL: 30d
      OTP_LENGTH: '6'
      OTP_TTL_SECONDS: '300'
      OTP_MAX_ATTEMPTS: '3'
      OTP_THROTTLE_WINDOW_SECONDS: '900'
      OTP_THROTTLE_MAX_PER_WINDOW: '3'
      SMS_PROVIDER: mock
      STORAGE_PROVIDER: mock
      CINETPAY_MODE: mock
      CINETPAY_SECRET_KEY: ci_only_secret_value_for_hmac_tests
      PORT: '3000'

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.0.0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Prisma generate
        run: pnpm --filter @worka/api exec prisma generate

      - name: Prisma migrate deploy
        run: pnpm --filter @worka/api exec prisma migrate deploy

      - name: Lint
        run: pnpm --filter @worka/api lint

      - name: Format check
        run: pnpm --filter @worka/api format:check

      - name: Build
        run: pnpm --filter @worka/api build

      - name: Unit tests
        run: pnpm --filter @worka/api test

      - name: E2E tests
        run: pnpm --filter @worka/api test:e2e
```

- [ ] **Step 2: Add CI secrets in GitHub**

In the GitHub UI:
- Repo → Settings → Secrets and variables → Actions → New repository secret
- Add `CI_JWT_ACCESS_SECRET` and `CI_JWT_REFRESH_SECRET` with 64-char random strings.

**Do not paste the values in the chat with Claude — set them directly in the GitHub UI.**

- [ ] **Step 3: Push the workflow file and verify it runs**

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint, build, unit, e2e"
git push
```

Wait for the run to complete on GitHub Actions tab.
Expected: green checkmark on every job. If a job fails, read the log and fix the underlying issue locally before pushing a fix.

---

## Task 4: CodeQL workflow (security scanning)

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Workflow**

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

- [ ] **Step 2: Commit and push**

```powershell
git add .github/workflows/codeql.yml
git commit -m "ci: add CodeQL static security analysis"
git push
```

Wait for the run to finish on GitHub. Expected: green, no critical findings.

---

## Task 5: Provision Railway staging environment

**Not in-repo — done in the Railway dashboard. Do these steps in the browser.**

- [ ] **Step 1: Create Railway project**

In Railway dashboard:
- New Project → Deploy from GitHub repo → select `doums6236/worka`
- Set project name to `worka-staging`

- [ ] **Step 2: Add Postgres plugin**

- In the project, click "+ New" → Database → PostgreSQL
- Note the auto-generated `DATABASE_URL` (Railway will expose it as `${{Postgres.DATABASE_URL}}` to other services)

- [ ] **Step 3: Add Redis plugin**

- "+ New" → Database → Redis
- Note `REDIS_URL` as `${{Redis.REDIS_URL}}`

- [ ] **Step 4: Configure the API service**

For the service Railway auto-created from the repo:
- **Root Directory**: `/`
- **Dockerfile Path**: `apps/api/Dockerfile`
- **Build context**: `.` (the repo root)

Service-level environment variables (use Railway references for DB/Redis, fill secrets directly in UI):

```
NODE_ENV=staging
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

JWT_ACCESS_SECRET=<paste a freshly generated 64-char string in Railway UI>
JWT_REFRESH_SECRET=<paste another 64-char string in Railway UI>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

OTP_LENGTH=6
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_THROTTLE_WINDOW_SECONDS=900
OTP_THROTTLE_MAX_PER_WINDOW=3

SMS_PROVIDER=mock           # switch to "cinetpay" once we have real keys
STORAGE_PROVIDER=mock        # switch to "r2" once R2 bucket exists
CINETPAY_MODE=mock           # switch to "sandbox" once CinetPay sandbox keys are added
```

**Reminder:** never paste secret values in the chat with Claude — set them directly in the Railway UI.

- [ ] **Step 5: Trigger first deploy**

After saving env vars, Railway auto-redeploys. Watch the build logs.
Expected: build passes (Dockerfile multi-stage completes), `prisma migrate deploy` succeeds at start, then `Worka API listening on http://localhost:3000`.

- [ ] **Step 6: Generate public domain**

In the API service → Settings → Networking → Generate Domain. Note the URL (e.g., `worka-staging-production.up.railway.app`).

- [ ] **Step 7: Smoke-test live API**

In a local terminal:

```powershell
curl https://worka-staging-production.up.railway.app/api/v1/health
```

Expected: `{"status":"ok","checks":{"api":"ok","postgres":"ok","redis":"ok"},...}`.

Then try a full auth round-trip:

```powershell
curl -X POST https://worka-staging-production.up.railway.app/api/v1/auth/send-otp -H "Content-Type: application/json" -d '{\"phone\":\"+224622123456\"}'
```

Since `SMS_PROVIDER=mock`, the OTP is in Railway logs (visible in the dashboard). Note it, then:

```powershell
curl -X POST https://worka-staging-production.up.railway.app/api/v1/auth/verify-otp -H "Content-Type: application/json" -d '{\"phone\":\"+224622123456\",\"code\":\"<paste>\"}'
```

Expected: returns `accessToken`, `refreshToken`, `user`. **The API is now live in staging.**

---

## Task 6: Add a `railway.json` to pin build settings

**Files:**
- Create: `railway.json`

- [ ] **Step 1: File**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

- [ ] **Step 2: Commit + push**

```powershell
git add railway.json
git commit -m "ci(railway): pin docker build path and health check"
git push
```

Railway auto-redeploys. Watch logs to confirm the health check is now actively probed.

---

## Task 7: Documentation update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Running locally" + "Staging URL" section**

```markdown
## Running locally

Prereqs: Node 20, pnpm 9, Docker.

```powershell
pnpm install
pnpm db:up
Copy-Item apps/api/.env.example apps/api/.env
# Edit apps/api/.env: generate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (64+ chars each).
pnpm --filter @worka/api exec prisma migrate deploy
pnpm api:dev
```

The API listens on http://localhost:3000. Health: GET /api/v1/health.

## Staging

Auto-deployed from `main` to Railway.

URL: https://<your-railway-domain> (set after Plan 1D)

Health endpoint: `/api/v1/health` (Railway also probes it for auto-restart).
```

- [ ] **Step 2: Commit + push**

```powershell
git add README.md
git commit -m "docs: add running locally and staging sections to README"
git push
git tag -a backend-1d-cicd-deploy-done -m "Backend 1D: CI/CD and staging deploy complete"
git push --tags
```

---

## Task 8: Final acceptance run

- [ ] **Step 1: Trigger CI by pushing a trivial empty commit**

```powershell
git commit --allow-empty -m "chore: trigger CI smoke run"
git push
```
Expected on GitHub Actions: CI green (lint, build, unit, e2e). CodeQL green.

- [ ] **Step 2: Re-check staging health**

```powershell
curl https://<railway-domain>/api/v1/health
```
Expected: ok.

- [ ] **Step 3: Open and inspect Railway logs**

In Railway dashboard → API service → Logs. Confirm no errors during last hour.

- [ ] **Step 4: Tag and celebrate**

```powershell
git tag -a backend-mvp-complete -m "Backend MVP (1A+1B+1C+1D) complete and deployed to staging"
git push --tags
```

---

## Done criteria for Plan 1D

- GitHub Actions CI runs on every push, all jobs green.
- CodeQL analysis runs on push and weekly schedule, no critical findings.
- Railway has a `worka-staging` project with Postgres + Redis + API.
- The API is publicly reachable at `https://<railway-domain>/api/v1/health` and returns `status: ok`.
- An auth round-trip works end-to-end against the staging URL (send-otp + verify-otp + /me).
- Git tag `backend-mvp-complete` is pushed.

The backend MVP (sub-project #1) is complete. Next: sub-projects #2 (web admin), #3 (web recruiter), #4 (app mobile), #5 (IA premium), #6 (ads + premium payments). Each gets its own brainstorm → spec → plan cycle.
