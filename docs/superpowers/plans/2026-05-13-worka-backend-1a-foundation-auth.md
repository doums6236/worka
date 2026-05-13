# Worka Backend 1A — Foundation + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Worka monorepo, scaffold the NestJS API, set up PostgreSQL via Prisma, and implement working phone+OTP authentication that issues JWT access and refresh tokens.

**Architecture:** PNPM workspaces monorepo with `apps/api` (NestJS) and `packages/shared-types`. NestJS 11 with Prisma 6 on PostgreSQL 16. OTP codes stored in Redis with TTL. JWT access (15 min) + refresh (30 days) issued on successful OTP verification. Phone validation via libphonenumber-js.

**Tech Stack:** Node 20 LTS, PNPM 9, TypeScript 5, NestJS 11, Prisma 6, PostgreSQL 16, Redis 7, Jest, Zod, libphonenumber-js, jsonwebtoken, ioredis.

---

## File Structure

After this plan, the repo looks like:

```
worka/
├── apps/
│   └── api/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   └── env.schema.ts
│       │   ├── common/
│       │   │   ├── prisma.service.ts
│       │   │   ├── redis.service.ts
│       │   │   └── filters/
│       │   │       └── http-exception.filter.ts
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── otp.service.ts
│       │   │   ├── jwt.service.ts
│       │   │   ├── dto/
│       │   │   │   ├── send-otp.dto.ts
│       │   │   │   └── verify-otp.dto.ts
│       │   │   ├── guards/
│       │   │   │   └── jwt.guard.ts
│       │   │   └── decorators/
│       │   │       └── current-user.decorator.ts
│       │   └── sms/
│       │       ├── sms.module.ts
│       │       └── sms.service.ts
│       ├── test/
│       │   ├── app.e2e-spec.ts
│       │   ├── auth.e2e-spec.ts
│       │   └── jest-e2e.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── .env.example
├── packages/
│   └── shared-types/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── pnpm-workspace.yaml
├── package.json
├── .nvmrc
└── docker-compose.yml          # postgres + redis local
```

Each file has one clear responsibility. The auth module owns auth concerns only. SMS sending lives in its own module so we can swap providers without touching auth.

---

## Task 1: Setup monorepo root and PNPM workspaces

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.nvmrc`
- Modify: `.gitignore` (verify completeness)

- [ ] **Step 1: Create `.nvmrc`**

```
20
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "worka",
  "version": "0.0.1",
  "private": true,
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "api:dev": "pnpm --filter @worka/api dev",
    "api:build": "pnpm --filter @worka/api build",
    "api:test": "pnpm --filter @worka/api test",
    "api:test:e2e": "pnpm --filter @worka/api test:e2e",
    "db:up": "docker compose up -d postgres redis",
    "db:down": "docker compose down"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 4: Verify pnpm is installed**

Run: `pnpm --version`
Expected: outputs `9.x.x` or higher. If not, run `npm install -g pnpm@9`.

- [ ] **Step 5: Run `pnpm install` to initialize lockfile**

Run: `pnpm install`
Expected: creates `pnpm-lock.yaml` and `node_modules/`. No errors.

- [ ] **Step 6: Commit**

```powershell
git add pnpm-workspace.yaml package.json .nvmrc pnpm-lock.yaml
git commit -m "chore: initialize PNPM workspaces monorepo"
```

---

## Task 2: Setup local Postgres + Redis with Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example` (root)

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: worka-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: worka
      POSTGRES_PASSWORD: worka_dev_only
      POSTGRES_DB: worka
    ports:
      - "5433:5432"   # host 5433 to avoid clashing with a native Postgres on 5432 (Windows install)
    volumes:
      - worka-pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: worka-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - worka-redisdata:/data

volumes:
  worka-pgdata:
  worka-redisdata:
```

- [ ] **Step 2: Create root `.env.example`**

```
# Local development only - real secrets go in Railway/Vercel env vars
DATABASE_URL=postgresql://worka:worka_dev_only@localhost:5433/worka
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 3: Start services**

Run: `pnpm db:up`
Expected: `worka-postgres` and `worka-redis` containers running. Verify with `docker ps`.

- [ ] **Step 4: Verify Postgres is reachable**

Run: `docker exec -it worka-postgres psql -U worka -d worka -c "SELECT version();"`
Expected: outputs PostgreSQL 16.x version string.

- [ ] **Step 5: Verify Redis is reachable**

Run: `docker exec -it worka-redis redis-cli ping`
Expected: outputs `PONG`.

- [ ] **Step 6: Commit**

```powershell
git add docker-compose.yml .env.example
git commit -m "chore: add docker compose for local postgres and redis"
```

---

## Task 3: Scaffold NestJS app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/test/jest-e2e.json`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@worka/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint src --max-warnings 0",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@prisma/client": "^6.0.0",
    "ioredis": "^5.4.0",
    "libphonenumber-js": "^1.11.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^3.23.0",
    "helmet": "^8.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/supertest": "^6.0.0",
    "jest": "^29.7.0",
    "prisma": "^6.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 4: Create `apps/api/.env.example`**

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://worka:worka_dev_only@localhost:5433/worka
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change_me_to_a_64_char_random_string
JWT_REFRESH_SECRET=change_me_to_a_different_64_char_random_string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

OTP_LENGTH=6
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_THROTTLE_WINDOW_SECONDS=900
OTP_THROTTLE_MAX_PER_WINDOW=3

SMS_PROVIDER=mock
# Real values for staging/prod, set via Railway env vars:
# CINETPAY_API_KEY=
# CINETPAY_SITE_ID=
```

- [ ] **Step 5: Create `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Worka API listening on http://localhost:${port}`);
}
bootstrap();
```

> Note: nous n'utilisons PAS `ValidationPipe` car notre stratégie de validation est **Zod** (chaque controller appelle `schema.safeParse(body)` avant de passer à un service). Ajouter `useGlobalPipes(new ValidationPipe(...))` exigerait d'installer `class-validator` et `class-transformer` qu'on n'utilise pas. Voir Tasks 11-13 pour la validation Zod en pratique.

- [ ] **Step 6: Create `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

- [ ] **Step 7: Create `apps/api/test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 8: Install dependencies**

Run: `pnpm install`
Expected: installs all NestJS deps in `apps/api/node_modules/`. No errors.

- [ ] **Step 9: Verify the app starts**

In `apps/api`, create a quick `.env` from `.env.example`:
```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Run: `pnpm api:dev`
Expected: console shows "Worka API listening on http://localhost:3000" and `curl http://localhost:3000/api/v1` returns 404 (no routes yet, that's normal).

Stop with `Ctrl+C`.

- [ ] **Step 10: Commit**

```powershell
git add apps/api/ pnpm-lock.yaml
git commit -m "feat(api): scaffold NestJS app with config, helmet, validation"
```

---

## Task 4: Setup Prisma schema for User entity

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/common/prisma.service.ts`

- [ ] **Step 1: Create `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  candidate
  recruiter
  admin
}

enum UserStatus {
  active
  pending
  suspended
  deleted
}

model User {
  id           String     @id @default(uuid())
  phone        String     @unique
  role         UserRole
  status       UserStatus @default(pending)
  countryCode  String?    @map("country_code")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  lastSeenAt   DateTime?  @map("last_seen_at")

  @@map("users")
}
```

- [ ] **Step 2: Run first migration**

In `apps/api/`:
Run: `pnpm prisma:migrate -- --name init_user`
Expected: prompts for migration name (already provided via flag), creates `prisma/migrations/0001_init_user/migration.sql`, applies to local DB. Confirms "Database is in sync with schema".

- [ ] **Step 3: Verify table exists**

Run: `docker exec -it worka-postgres psql -U worka -d worka -c "\dt"`
Expected: lists `users` and `_prisma_migrations`.

- [ ] **Step 4: Create `apps/api/src/common/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 5: Write a smoke test for PrismaService**

Create `apps/api/src/common/prisma.service.spec.ts`:

```typescript
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('connects to the database and can query users count', async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
  });
});
```

- [ ] **Step 6: Run the test, expect PASS**

In `apps/api/`:
Run: `pnpm test prisma.service`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/prisma apps/api/src/common pnpm-lock.yaml
git commit -m "feat(api): add prisma with User model and connection service"
```

---

## Task 5: Redis service with health check

**Files:**
- Create: `apps/api/src/common/redis.service.ts`
- Create: `apps/api/src/common/redis.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`apps/api/src/common/redis.service.spec.ts`:

```typescript
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let redis: RedisService;

  beforeAll(async () => {
    redis = new RedisService();
    await redis.onModuleInit();
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  it('sets and gets a string with TTL', async () => {
    await redis.setEx('test:key', 10, 'hello');
    const value = await redis.get('test:key');
    expect(value).toBe('hello');
  });

  it('returns null for missing key', async () => {
    const value = await redis.get('test:missing');
    expect(value).toBeNull();
  });

  it('increments a counter', async () => {
    await redis.del('test:counter');
    const v1 = await redis.incr('test:counter');
    const v2 = await redis.incr('test:counter');
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test redis.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/common/redis.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  async onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test redis.service`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/common pnpm-lock.yaml
git commit -m "feat(api): add redis service with get/setEx/incr/del"
```

---

## Task 6: Config schema validation with Zod

**Files:**
- Create: `apps/api/src/config/env.schema.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/config/env.schema.spec.ts`:

```typescript
import { envSchema } from './env.schema';

describe('envSchema', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://x:y@localhost:5433/z',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_REFRESH_SECRET: 'b'.repeat(64),
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    OTP_LENGTH: '6',
    OTP_TTL_SECONDS: '300',
    OTP_MAX_ATTEMPTS: '3',
    OTP_THROTTLE_WINDOW_SECONDS: '900',
    OTP_THROTTLE_MAX_PER_WINDOW: '3',
    SMS_PROVIDER: 'mock',
  };

  it('parses valid env', () => {
    const parsed = envSchema.parse(validEnv);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.OTP_LENGTH).toBe(6);
  });

  it('rejects missing DATABASE_URL', () => {
    const bad = { ...validEnv };
    delete (bad as any).DATABASE_URL;
    expect(() => envSchema.parse(bad)).toThrow();
  });

  it('rejects short JWT secrets', () => {
    const bad = { ...validEnv, JWT_ACCESS_SECRET: 'short' };
    expect(() => envSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test env.schema`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/config/env.schema.ts`**

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().startsWith('redis://'),

  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  OTP_THROTTLE_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  OTP_THROTTLE_MAX_PER_WINDOW: z.coerce.number().int().positive().default(3),

  SMS_PROVIDER: z.enum(['mock', 'cinetpay']).default('mock'),
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test env.schema`
Expected: 3 passed.

- [ ] **Step 5: Wire validation into `AppModule`**

Modify `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Verify app still starts with valid `.env`**

In `apps/api/.env`, set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to 64-char random strings:
```powershell
# PowerShell one-liner to generate
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Run: `pnpm api:dev`
Expected: starts without error.

- [ ] **Step 7: Verify app refuses to start with invalid env**

Temporarily set `JWT_ACCESS_SECRET=short` in `.env` and start. Restore after.
Expected: starts and throws Zod validation error, exits with non-zero.

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src
git commit -m "feat(api): validate env vars with zod at startup"
```

---

## Task 7: Phone number validation utility

**Files:**
- Create: `apps/api/src/auth/phone.util.ts`
- Create: `apps/api/src/auth/phone.util.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { normalizePhone, isSupportedCountry } from './phone.util';

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it('normalizes Guinea number with country code', () => {
      const result = normalizePhone('+224 622 12 34 56');
      expect(result).toEqual({ e164: '+224622123456', countryCode: 'GN' });
    });

    it('normalizes Senegal number', () => {
      const result = normalizePhone('+221 77 123 45 67');
      expect(result.countryCode).toBe('SN');
    });

    it('rejects invalid number', () => {
      expect(() => normalizePhone('12345')).toThrow('Invalid phone number');
    });

    it('rejects landline (non-mobile)', () => {
      expect(() => normalizePhone('+33 1 42 86 82 00')).toThrow();
    });
  });

  describe('isSupportedCountry', () => {
    it('accepts GN, SN, ML, CI, BF, TG, BJ, NE, MR', () => {
      ['GN', 'SN', 'ML', 'CI', 'BF', 'TG', 'BJ', 'NE', 'MR'].forEach((c) => {
        expect(isSupportedCountry(c)).toBe(true);
      });
    });

    it('rejects unsupported country', () => {
      expect(isSupportedCountry('US')).toBe(false);
      expect(isSupportedCountry('FR')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test phone.util`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/auth/phone.util.ts`**

```typescript
import { parsePhoneNumberWithError, CountryCode } from 'libphonenumber-js';

const SUPPORTED_COUNTRIES: CountryCode[] = [
  'GN', 'SN', 'ML', 'CI', 'BF', 'TG', 'BJ', 'NE', 'MR',
];

export function isSupportedCountry(code: string): boolean {
  return (SUPPORTED_COUNTRIES as string[]).includes(code);
}

export interface NormalizedPhone {
  e164: string;
  countryCode: string;
}

export function normalizePhone(raw: string): NormalizedPhone {
  const parsed = parsePhoneNumberWithError(raw);
  if (!parsed.isValid()) {
    throw new Error('Invalid phone number');
  }
  if (parsed.getType() !== 'MOBILE' && parsed.getType() !== 'FIXED_LINE_OR_MOBILE') {
    throw new Error('Phone number must be mobile');
  }
  if (!parsed.country || !isSupportedCountry(parsed.country)) {
    throw new Error('Country not supported');
  }
  return {
    e164: parsed.number,
    countryCode: parsed.country,
  };
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test phone.util`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/auth/phone.util.ts apps/api/src/auth/phone.util.spec.ts
git commit -m "feat(auth): add phone normalization for Worka supported countries"
```

---

## Task 8: SMS module with mock provider

**Files:**
- Create: `apps/api/src/sms/sms.module.ts`
- Create: `apps/api/src/sms/sms.service.ts`
- Create: `apps/api/src/sms/sms.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { SmsService } from './sms.service';

describe('SmsService (mock provider)', () => {
  let sms: SmsService;
  const originalLog = console.log;
  let logs: string[];

  beforeEach(() => {
    process.env.SMS_PROVIDER = 'mock';
    sms = new SmsService();
    logs = [];
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('logs OTP to console with mock provider', async () => {
    await sms.sendOtp('+224622123456', '123456');
    const joined = logs.join('\n');
    expect(joined).toContain('+224622123456');
    expect(joined).toContain('123456');
  });

  it('throws if SMS_PROVIDER is cinetpay without keys', async () => {
    process.env.SMS_PROVIDER = 'cinetpay';
    const realSms = new SmsService();
    await expect(realSms.sendOtp('+224622123456', '123456')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test sms.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/sms/sms.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phoneE164: string, code: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER ?? 'mock';

    if (provider === 'mock') {
      console.log(`[MOCK SMS] to ${phoneE164}: Your Worka code is ${code}`);
      return;
    }

    if (provider === 'cinetpay') {
      const apiKey = process.env.CINETPAY_API_KEY;
      const siteId = process.env.CINETPAY_SITE_ID;
      if (!apiKey || !siteId) {
        throw new Error('CINETPAY_API_KEY and CINETPAY_SITE_ID must be set');
      }
      throw new Error('CinetPay SMS provider not yet implemented — see plan 1C');
    }

    throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
```

- [ ] **Step 4: Create `apps/api/src/sms/sms.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
```

- [ ] **Step 5: Run test, expect PASS**

Run: `pnpm test sms.service`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/sms
git commit -m "feat(sms): add SMS module with mock provider for local dev"
```

---

## Task 9: OTP service (generate, store, verify, throttle)

**Files:**
- Create: `apps/api/src/auth/otp.service.ts`
- Create: `apps/api/src/auth/otp.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { OtpService } from './otp.service';
import { RedisService } from '../common/redis.service';

describe('OtpService', () => {
  let otp: OtpService;
  let redis: RedisService;

  beforeAll(async () => {
    process.env.OTP_LENGTH = '6';
    process.env.OTP_TTL_SECONDS = '60';
    process.env.OTP_MAX_ATTEMPTS = '3';
    process.env.OTP_THROTTLE_WINDOW_SECONDS = '900';
    process.env.OTP_THROTTLE_MAX_PER_WINDOW = '3';
    redis = new RedisService();
    await redis.onModuleInit();
    otp = new OtpService(redis);
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  beforeEach(async () => {
    await redis.del('otp:+224622123456');
    await redis.del('otp:attempts:+224622123456');
    await redis.del('otp:throttle:+224622123456');
  });

  it('generates a code of configured length', async () => {
    const code = await otp.generate('+224622123456');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies a correct code', async () => {
    const code = await otp.generate('+224622123456');
    const result = await otp.verify('+224622123456', code);
    expect(result).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    await otp.generate('+224622123456');
    const result = await otp.verify('+224622123456', '000000');
    expect(result).toBe(false);
  });

  it('locks after 3 failed attempts', async () => {
    await otp.generate('+224622123456');
    await otp.verify('+224622123456', '000000');
    await otp.verify('+224622123456', '000000');
    await otp.verify('+224622123456', '000000');
    await expect(otp.verify('+224622123456', '000000')).rejects.toThrow(/locked/i);
  });

  it('throttles after 3 generate calls in window', async () => {
    await otp.generate('+224622123456');
    await otp.generate('+224622123456');
    await otp.generate('+224622123456');
    await expect(otp.generate('+224622123456')).rejects.toThrow(/throttled/i);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test otp.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/auth/otp.service.ts`**

```typescript
import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from '../common/redis.service';

@Injectable()
export class OtpService {
  constructor(private readonly redis: RedisService) {}

  private get length() { return Number(process.env.OTP_LENGTH ?? 6); }
  private get ttl() { return Number(process.env.OTP_TTL_SECONDS ?? 300); }
  private get maxAttempts() { return Number(process.env.OTP_MAX_ATTEMPTS ?? 3); }
  private get throttleWindow() { return Number(process.env.OTP_THROTTLE_WINDOW_SECONDS ?? 900); }
  private get throttleMax() { return Number(process.env.OTP_THROTTLE_MAX_PER_WINDOW ?? 3); }

  private keyCode(phone: string) { return `otp:${phone}`; }
  private keyAttempts(phone: string) { return `otp:attempts:${phone}`; }
  private keyThrottle(phone: string) { return `otp:throttle:${phone}`; }

  async generate(phone: string): Promise<string> {
    const count = await this.redis.incr(this.keyThrottle(phone));
    if (count === 1) {
      await this.redis.expire(this.keyThrottle(phone), this.throttleWindow);
    }
    if (count > this.throttleMax) {
      throw new HttpException('OTP request throttled — please wait', HttpStatus.TOO_MANY_REQUESTS);
    }

    const min = 10 ** (this.length - 1);
    const max = 10 ** this.length;
    const code = String(randomInt(min, max));

    await this.redis.setEx(this.keyCode(phone), this.ttl, code);
    await this.redis.del(this.keyAttempts(phone));
    return code;
  }

  async verify(phone: string, providedCode: string): Promise<boolean> {
    const stored = await this.redis.get(this.keyCode(phone));
    if (!stored) {
      throw new BadRequestException('OTP expired or not requested');
    }

    const attempts = await this.redis.incr(this.keyAttempts(phone));
    if (attempts === 1) {
      await this.redis.expire(this.keyAttempts(phone), this.ttl);
    }
    if (attempts > this.maxAttempts) {
      await this.redis.del(this.keyCode(phone));
      throw new HttpException('OTP locked — too many attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (stored !== providedCode) {
      return false;
    }

    await this.redis.del(this.keyCode(phone));
    await this.redis.del(this.keyAttempts(phone));
    return true;
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test otp.service`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/auth/otp.service.ts apps/api/src/auth/otp.service.spec.ts
git commit -m "feat(auth): add OTP service with TTL, attempt locking, throttling"
```

---

## Task 10: JWT service (issue + verify access and refresh tokens)

**Files:**
- Create: `apps/api/src/auth/jwt.service.ts`
- Create: `apps/api/src/auth/jwt.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';
    service = new JwtService();
  });

  it('issues an access token and verifies it', () => {
    const token = service.signAccess({ sub: 'user-1', role: 'candidate' });
    const payload = service.verifyAccess(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('candidate');
  });

  it('issues a refresh token and verifies it', () => {
    const token = service.signRefresh({ sub: 'user-1' });
    const payload = service.verifyRefresh(token);
    expect(payload.sub).toBe('user-1');
  });

  it('rejects access token signed with refresh secret', () => {
    const token = service.signRefresh({ sub: 'user-1' });
    expect(() => service.verifyAccess(token)).toThrow();
  });

  it('rejects tampered token', () => {
    const token = service.signAccess({ sub: 'user-1', role: 'candidate' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => service.verifyAccess(tampered)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test jwt.service`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/api/src/auth/jwt.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AccessPayload {
  sub: string;
  role: 'candidate' | 'recruiter' | 'admin';
}

export interface RefreshPayload {
  sub: string;
}

@Injectable()
export class JwtService {
  private get accessSecret() { return process.env.JWT_ACCESS_SECRET!; }
  private get refreshSecret() { return process.env.JWT_REFRESH_SECRET!; }
  private get accessTtl() { return process.env.JWT_ACCESS_TTL ?? '15m'; }
  private get refreshTtl() { return process.env.JWT_REFRESH_TTL ?? '30d'; }

  signAccess(payload: AccessPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessTtl as jwt.SignOptions['expiresIn'] });
  }

  signRefresh(payload: RefreshPayload): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshTtl as jwt.SignOptions['expiresIn'] });
  }

  verifyAccess(token: string): AccessPayload {
    return jwt.verify(token, this.accessSecret) as AccessPayload;
  }

  verifyRefresh(token: string): RefreshPayload {
    return jwt.verify(token, this.refreshSecret) as RefreshPayload;
  }
}
```

- [ ] **Step 4: Install jsonwebtoken**

In `apps/api/`:
Run: `pnpm add jsonwebtoken && pnpm add -D @types/jsonwebtoken`

- [ ] **Step 5: Run test, expect PASS**

Run: `pnpm test jwt.service`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/auth apps/api/package.json pnpm-lock.yaml
git commit -m "feat(auth): add JWT service for access and refresh tokens"
```

---

## Task 11: AuthService — send OTP

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/dto/send-otp.dto.ts`
- Create: `apps/api/src/auth/dto/verify-otp.dto.ts`

- [ ] **Step 1: Write the failing test (sendOtp branch)**

`apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from './jwt.service';

describe('AuthService.sendOtp', () => {
  const mockOtp = { generate: jest.fn(async () => '123456'), verify: jest.fn() } as unknown as OtpService;
  const mockSms = { sendOtp: jest.fn(async () => undefined) } as unknown as SmsService;
  const mockPrisma = {} as PrismaService;
  const mockJwt = {} as JwtService;
  const auth = new AuthService(mockOtp, mockSms, mockPrisma, mockJwt);

  it('normalizes phone and sends OTP via SMS', async () => {
    await auth.sendOtp('+224 622 12 34 56');
    expect(mockOtp.generate).toHaveBeenCalledWith('+224622123456');
    expect(mockSms.sendOtp).toHaveBeenCalledWith('+224622123456', '123456');
  });

  it('rejects invalid phone', async () => {
    await expect(auth.sendOtp('garbage')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test auth.service`
Expected: FAIL.

- [ ] **Step 3: Create DTOs**

`apps/api/src/auth/dto/send-otp.dto.ts`:

```typescript
import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(6).max(20),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;
```

`apps/api/src/auth/dto/verify-otp.dto.ts`:

```typescript
import { z } from 'zod';

export const verifyOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{4,8}$/),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
```

- [ ] **Step 4: Implement minimal `AuthService.sendOtp`**

`apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from './jwt.service';
import { normalizePhone } from './phone.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly sms: SmsService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(rawPhone: string): Promise<{ phone: string }> {
    const { e164 } = normalizePhone(rawPhone);
    const code = await this.otp.generate(e164);
    await this.sms.sendOtp(e164, code);
    return { phone: e164 };
  }
}
```

- [ ] **Step 5: Run test, expect PASS**

Run: `pnpm test auth.service`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/auth
git commit -m "feat(auth): implement sendOtp with phone normalization"
```

---

## Task 12: AuthService — verify OTP + create/load user + issue JWT

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Add failing tests for verifyOtp**

Append to `apps/api/src/auth/auth.service.spec.ts`:

```typescript
describe('AuthService.verifyOtp', () => {
  const mockOtp = {
    generate: jest.fn(),
    verify: jest.fn(),
  } as unknown as OtpService;

  const mockSms = { sendOtp: jest.fn() } as unknown as SmsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const mockJwt = {
    signAccess: jest.fn(() => 'access.jwt.token'),
    signRefresh: jest.fn(() => 'refresh.jwt.token'),
  } as unknown as JwtService;

  const auth = new AuthService(mockOtp, mockSms, mockPrisma, mockJwt);

  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid OTP', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(false);
    await expect(auth.verifyOtp('+224622123456', '000000')).rejects.toThrow(/invalid/i);
  });

  it('creates a candidate user on first successful verify', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u-1', phone: '+224622123456', role: 'candidate', status: 'active',
    });
    const result = await auth.verifyOtp('+224622123456', '123456');
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.refreshToken).toBe('refresh.jwt.token');
    expect(result.user.role).toBe('candidate');
  });

  it('reuses existing user on subsequent verify', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-1', phone: '+224622123456', role: 'recruiter', status: 'active',
    });
    const result = await auth.verifyOtp('+224622123456', '123456');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(result.user.role).toBe('recruiter');
  });
});
```

- [ ] **Step 2: Run tests, expect 3 new failures**

Run: `pnpm test auth.service`

- [ ] **Step 3: Implement verifyOtp**

Append to `apps/api/src/auth/auth.service.ts`:

```typescript
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

// ... inside class AuthService ...

  async verifyOtp(rawPhone: string, code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; role: string; status: string };
  }> {
    const { e164, countryCode } = normalizePhone(rawPhone);
    const ok = await this.otp.verify(e164, code);
    if (!ok) {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user: User | null = await this.prisma.user.findUnique({ where: { phone: e164 } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: e164,
          role: 'candidate',
          status: 'active',
          countryCode,
          lastSeenAt: new Date(),
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const accessToken = this.jwt.signAccess({ sub: user.id, role: user.role });
    const refreshToken = this.jwt.signRefresh({ sub: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, role: user.role, status: user.status },
    };
  }
```

- [ ] **Step 4: Run tests, expect 5 total passed**

Run: `pnpm test auth.service`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/auth
git commit -m "feat(auth): implement verifyOtp with user creation and JWT issuance"
```

---

## Task 13: AuthController + AuthModule wiring

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/common/common.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/common/common.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class CommonModule {}
```

- [ ] **Step 2: Create `apps/api/src/auth/auth.controller.ts`**

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { sendOtpSchema } from './dto/send-otp.dto';
import { verifyOtpSchema } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: unknown) {
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.auth.sendOtp(parsed.data.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: unknown) {
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.auth.verifyOtp(parsed.data.phone, parsed.data.code);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtService],
  exports: [JwtService],
})
export class AuthModule {}
```

- [ ] **Step 4: Modify `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    CommonModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Start the app and smoke-test with curl**

Run: `pnpm api:dev`

In another terminal:
```powershell
curl -X POST http://localhost:3000/api/v1/auth/send-otp -H "Content-Type: application/json" -d '{\"phone\":\"+224622123456\"}'
```
Expected: `200 OK`, response `{"phone":"+224622123456"}`. In the API console, see the mock SMS log line with a 6-digit code.

Note the code from the console, then:
```powershell
curl -X POST http://localhost:3000/api/v1/auth/verify-otp -H "Content-Type: application/json" -d '{\"phone\":\"+224622123456\",\"code\":\"<paste code>\"}'
```
Expected: `200 OK`, response contains `accessToken`, `refreshToken`, and `user.role: "candidate"`.

Stop the server with Ctrl+C.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src
git commit -m "feat(auth): wire AuthController with send-otp and verify-otp endpoints"
```

---

## Task 14: E2E test for the full auth flow

**Files:**
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write the failing E2E test**

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/common/redis.service';
import { PrismaService } from '../src/common/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let redis: RedisService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    redis = moduleRef.get(RedisService);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await redis.del('otp:+224622999888');
    await redis.del('otp:attempts:+224622999888');
    await redis.del('otp:throttle:+224622999888');
    await prisma.user.deleteMany({ where: { phone: '+224622999888' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/send-otp returns 200 and normalized phone', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+224 622 99 98 88' })
      .expect(200);
    expect(res.body.phone).toBe('+224622999888');
  });

  it('POST /api/v1/auth/verify-otp completes login and creates user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+224622999888' })
      .expect(200);

    const code = await redis.get('otp:+224622999888');
    expect(code).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+224622999888', code })
      .expect(200);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe('candidate');
    expect(res.body.user.phone).toBe('+224622999888');

    const user = await prisma.user.findUnique({ where: { phone: '+224622999888' } });
    expect(user).toBeTruthy();
    expect(user?.status).toBe('active');
  });

  it('rejects invalid phone with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: 'garbage' })
      .expect(400);
  });

  it('rejects wrong OTP with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+224622999888' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+224622999888', code: '000000' })
      .expect(401);
  });
});
```

- [ ] **Step 2: Run E2E test, expect PASS**

Run: `pnpm api:test:e2e`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/test
git commit -m "test(auth): add e2e tests for send-otp and verify-otp flow"
```

---

## Task 15: JWT guard + current-user decorator + /me endpoint

**Files:**
- Create: `apps/api/src/auth/guards/jwt.guard.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/auth/me.controller.ts`
- Modify: `apps/api/src/auth/auth.module.ts`

- [ ] **Step 1: Implement `apps/api/src/auth/guards/jwt.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../jwt.service';
import { Request } from 'express';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = auth.slice('Bearer '.length);
    try {
      const payload = this.jwt.verifyAccess(token);
      (req as Request & { user: typeof payload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

- [ ] **Step 2: Implement `apps/api/src/auth/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessPayload } from '../jwt.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
```

- [ ] **Step 3: Create `apps/api/src/auth/me.controller.ts`**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AccessPayload } from './jwt.service';
import { PrismaService } from '../common/prisma.service';

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getMe(@CurrentUser() user: AccessPayload) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    return dbUser;
  }
}
```

- [ ] **Step 4: Wire MeController and JwtGuard into AuthModule**

Modify `apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';
import { JwtGuard } from './guards/jwt.guard';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, OtpService, JwtService, JwtGuard],
  exports: [JwtService, JwtGuard],
})
export class AuthModule {}
```

- [ ] **Step 5: Add E2E test for /me**

Append to `apps/api/test/auth.e2e-spec.ts`:

```typescript
  it('GET /api/v1/me returns the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+224622999888' })
      .expect(200);
    const code = await redis.get('otp:+224622999888');
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+224622999888', code })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.phone).toBe('+224622999888');
  });

  it('GET /api/v1/me rejects requests without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401);
  });
```

- [ ] **Step 6: Run E2E tests, expect 6 passed**

Run: `pnpm api:test:e2e`
Expected: 6 passed.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/src apps/api/test
git commit -m "feat(auth): add JwtGuard, CurrentUser decorator, and /me endpoint"
```

---

## Task 16: Token refresh endpoint

**Files:**
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Add refresh logic in AuthService**

Append to `apps/api/src/auth/auth.service.ts`:

```typescript
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = this.jwt.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not active');
    }
    return {
      accessToken: this.jwt.signAccess({ sub: user.id, role: user.role }),
      refreshToken: this.jwt.signRefresh({ sub: user.id }),
    };
  }
```

- [ ] **Step 2: Add refresh DTO and endpoint**

Create `apps/api/src/auth/dto/refresh.dto.ts`:

```typescript
import { z } from 'zod';

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
```

Append to `apps/api/src/auth/auth.controller.ts`:

```typescript
import { refreshSchema } from './dto/refresh.dto';

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown) {
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.auth.refresh(parsed.data.refreshToken);
  }
```

- [ ] **Step 3: Add E2E test for refresh**

Append to `apps/api/test/auth.e2e-spec.ts`:

```typescript
  it('POST /api/v1/auth/refresh exchanges a valid refresh token for a new pair', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+224622999888' })
      .expect(200);
    const code = await redis.get('otp:+224622999888');
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+224622999888', code })
      .expect(200);

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).toBeTruthy();
    expect(refreshed.body.accessToken).not.toBe(login.body.accessToken);
  });

  it('rejects refresh with garbage token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'garbage.token.here' })
      .expect(401);
  });
```

- [ ] **Step 4: Run E2E, expect 8 passed**

Run: `pnpm api:test:e2e`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src apps/api/test
git commit -m "feat(auth): add /auth/refresh endpoint"
```

---

## Task 17: Global exception filter for consistent error responses

**Files:**
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create the filter**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as { message?: unknown }).message ?? body;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}
```

- [ ] **Step 2: Wire it in main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Worka API listening on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 3: Run all tests, expect everything still passes**

Run: `pnpm api:test && pnpm api:test:e2e`
Expected: all green.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/src
git commit -m "feat(api): add global exception filter for consistent JSON errors"
```

---

## Task 18: Health endpoint + final smoke test

**Files:**
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async health() {
    const checks = {
      api: 'ok',
      postgres: 'unknown',
      redis: 'unknown',
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'down';
    }
    try {
      await this.redis.setEx('health:probe', 1, '1');
      checks.redis = 'ok';
    } catch {
      checks.redis = 'down';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    return { status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() };
  }
}
```

- [ ] **Step 2: Create the module**

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 3: Wire in app.module**

Modify `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    CommonModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Smoke test**

Run: `pnpm api:dev`
Then in another terminal:
```powershell
curl http://localhost:3000/api/v1/health
```
Expected: `{"status":"ok","checks":{"api":"ok","postgres":"ok","redis":"ok"},...}`.

- [ ] **Step 5: Commit + final tag**

```powershell
git add apps/api/src
git commit -m "feat(api): add /health endpoint with postgres and redis checks"
git tag -a backend-1a-auth-done -m "Backend 1A: foundation + auth complete"
```

---

## Done criteria for Plan 1A

When all tasks above pass:
- `pnpm api:test` returns all green
- `pnpm api:test:e2e` returns all green
- `pnpm api:dev` starts the API on port 3000
- `curl http://localhost:3000/api/v1/health` returns `status: ok` with postgres and redis healthy
- A new phone number can register through `send-otp` → `verify-otp` and receive a JWT
- The JWT works against `/api/v1/me`
- The refresh token can rotate via `/api/v1/auth/refresh`

You now have a working, testable backend foundation with authentication. Move on to Plan 1B for the core domain entities.
