# Worka Backend 1B — Core Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all core domain entities (profiles, domains, skills, companies, jobs, applications, swipes, user preferences) with their REST endpoints and the `GET /jobs/feed` endpoint that powers the mobile swipe stack with personalized matching.

**Architecture:** One NestJS module per aggregate (profiles, domains, skills, companies, jobs, applications, swipes, feed). RBAC via a `@Roles()` decorator + `RolesGuard`. Object storage on Cloudflare R2 via the S3 SDK for CV uploads. Match scoring is a deterministic function combining domain overlap, skill overlap, geographic proximity, and swipe history.

**Tech Stack:** Same as 1A + `@aws-sdk/client-s3` for R2, `@nestjs/throttler` for endpoint-level throttling.

**Prerequisite:** Plan 1A complete and tagged `backend-1a-auth-done`.

---

## File Structure (additions)

```
apps/api/src/
├── profiles/
│   ├── profiles.module.ts
│   ├── candidate-profile.controller.ts
│   ├── candidate-profile.service.ts
│   ├── recruiter-profile.controller.ts
│   ├── recruiter-profile.service.ts
│   └── dto/...
├── domains/
│   ├── domains.module.ts
│   ├── domains.controller.ts
│   ├── domains.service.ts
│   └── dto/...
├── skills/
│   ├── skills.module.ts
│   ├── skills.controller.ts
│   ├── skills.service.ts
│   └── dto/...
├── companies/
│   ├── companies.module.ts
│   ├── companies.controller.ts
│   ├── companies.service.ts
│   └── dto/...
├── jobs/
│   ├── jobs.module.ts
│   ├── jobs.controller.ts
│   ├── jobs.service.ts
│   └── dto/...
├── applications/
│   ├── applications.module.ts
│   ├── applications.controller.ts
│   ├── applications.service.ts
│   └── dto/...
├── swipes/
│   ├── swipes.module.ts
│   ├── swipes.controller.ts
│   ├── swipes.service.ts
│   └── dto/...
├── feed/
│   ├── feed.module.ts
│   ├── feed.controller.ts
│   ├── feed.service.ts
│   └── match.util.ts
├── storage/
│   ├── storage.module.ts
│   └── storage.service.ts
└── auth/
    ├── guards/roles.guard.ts            # NEW
    └── decorators/roles.decorator.ts    # NEW
```

---

## Task 1: Extend Prisma schema with all 1B entities

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add new models to `schema.prisma`**

Append after the `User` model from 1A:

```prisma
model CandidateProfile {
  id                      String   @id @default(uuid())
  userId                  String   @unique @map("user_id")
  firstName               String?  @map("first_name")
  lastName                String?  @map("last_name")
  cvUrl                   String?  @map("cv_url")
  summary                 String?
  location                String?
  isPremium               Boolean  @default(false) @map("is_premium")
  premiumUntil            DateTime? @map("premium_until")
  aiCreditsRemaining      Int      @default(0) @map("ai_credits_remaining")
  autoApplyEnabled        Boolean  @default(false) @map("auto_apply_enabled")
  autoApplyMinMatchScore  Int      @default(80) @map("auto_apply_min_match_score")
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")

  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("candidate_profiles")
}

model RecruiterProfile {
  id            String    @id @default(uuid())
  userId        String    @unique @map("user_id")
  companyId     String?   @map("company_id")
  roleInCompany String?   @map("role_in_company")
  verifiedAt    DateTime? @map("verified_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  company       Company?  @relation(fields: [companyId], references: [id])

  @@map("recruiter_profiles")
}

model Company {
  id                 String   @id @default(uuid())
  name               String
  sector             String
  logoUrl            String?  @map("logo_url")
  country            String
  city               String?
  description        String?
  verifiedByAdminId  String?  @map("verified_by_admin_id")
  plan               String   @default("free")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  recruiters         RecruiterProfile[]
  jobs               Job[]

  @@map("companies")
}

model Domain {
  id        String   @id @default(uuid())
  nameFr    String   @map("name_fr")
  nameEn    String?  @map("name_en")
  icon      String?
  parentId  String?  @map("parent_id")
  createdAt DateTime @default(now()) @map("created_at")

  parent    Domain?  @relation("DomainHierarchy", fields: [parentId], references: [id])
  children  Domain[] @relation("DomainHierarchy")
  userDomains UserDomain[]
  skills    Skill[]
  jobs      Job[]

  @@map("domains")
}

model UserDomain {
  id       String @id @default(uuid())
  userId   String @map("user_id")
  domainId String @map("domain_id")
  priority Int

  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  domain   Domain @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@unique([userId, domainId])
  @@unique([userId, priority])
  @@map("user_domains")
}

model Skill {
  id        String   @id @default(uuid())
  name      String   @unique
  domainId  String?  @map("domain_id")
  createdAt DateTime @default(now()) @map("created_at")

  domain    Domain?  @relation(fields: [domainId], references: [id])
  jobSkills JobSkill[]

  @@map("skills")
}

enum JobType {
  cdi
  cdd
  stage
  freelance
}

enum JobStatus {
  draft
  pending
  published
  closed
  expired
}

model Job {
  id              String     @id @default(uuid())
  companyId       String     @map("company_id")
  postedByUserId  String     @map("posted_by_user_id")
  title           String
  description     String
  domainId        String     @map("domain_id")
  salaryMin       Int?       @map("salary_min")
  salaryMax       Int?       @map("salary_max")
  currency        String     @default("GNF")
  location        String?
  country         String
  type            JobType
  status          JobStatus  @default(draft)
  deadline        DateTime?
  viewCount       Int        @default(0) @map("view_count")
  applicationCount Int       @default(0) @map("application_count")
  publishedAt     DateTime?  @map("published_at")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  company         Company    @relation(fields: [companyId], references: [id])
  domain          Domain     @relation(fields: [domainId], references: [id])
  jobSkills       JobSkill[]
  applications    Application[]
  swipes          Swipe[]

  @@index([status, country])
  @@index([domainId])
  @@map("jobs")
}

model JobSkill {
  jobId   String @map("job_id")
  skillId String @map("skill_id")

  job     Job   @relation(fields: [jobId], references: [id], onDelete: Cascade)
  skill   Skill @relation(fields: [skillId], references: [id])

  @@id([jobId, skillId])
  @@map("job_skills")
}

enum SwipeDirection {
  left
  right
  saved
}

model Swipe {
  id                   String         @id @default(uuid())
  candidateUserId      String         @map("candidate_user_id")
  jobId                String         @map("job_id")
  direction            SwipeDirection
  swipedAt             DateTime       @default(now()) @map("swiped_at")
  matchScoreAtSwipe    Int?           @map("match_score_at_swipe")

  candidate            User           @relation(fields: [candidateUserId], references: [id], onDelete: Cascade)
  job                  Job            @relation(fields: [jobId], references: [id])

  @@unique([candidateUserId, jobId])
  @@map("swipes")
}

enum ApplicationStatus {
  pending
  viewed
  shortlisted
  rejected
  hired
}

enum AppliedVia {
  manual
  auto_apply
}

model Application {
  id                  String            @id @default(uuid())
  jobId               String            @map("job_id")
  candidateUserId     String            @map("candidate_user_id")
  status              ApplicationStatus @default(pending)
  coverLetterUrl      String?           @map("cover_letter_url")
  appliedVia          AppliedVia        @default(manual) @map("applied_via")
  matchScore          Int?              @map("match_score")
  recruiterViewedAt   DateTime?         @map("recruiter_viewed_at")
  appliedAt           DateTime          @default(now()) @map("applied_at")

  job                 Job               @relation(fields: [jobId], references: [id])
  candidate           User              @relation(fields: [candidateUserId], references: [id], onDelete: Cascade)

  @@unique([jobId, candidateUserId])
  @@map("applications")
}
```

Also update the `User` model to add the missing back-relations:

```prisma
model User {
  // ... existing fields ...

  candidateProfile  CandidateProfile?
  recruiterProfile  RecruiterProfile?
  userDomains       UserDomain[]
  swipes            Swipe[]
  applications      Application[]
}
```

- [ ] **Step 2: Generate migration**

Run: `pnpm prisma:migrate -- --name core_entities`
Expected: creates `prisma/migrations/000X_core_entities/migration.sql`, applies cleanly.

- [ ] **Step 3: Verify tables**

Run: `docker exec -it worka-postgres psql -U worka -d worka -c "\dt"`
Expected: lists all new tables (`candidate_profiles`, `recruiter_profiles`, `companies`, `domains`, `user_domains`, `skills`, `jobs`, `job_skills`, `swipes`, `applications`).

- [ ] **Step 4: Commit**

```powershell
git add apps/api/prisma
git commit -m "feat(db): add core domain entities (profiles, jobs, applications, swipes)"
```

---

## Task 2: RolesGuard and @Roles() decorator

**Files:**
- Create: `apps/api/src/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.spec.ts`
- Modify: `apps/api/src/auth/auth.module.ts`

- [ ] **Step 1: Create decorator**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Write the failing test**

```typescript
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function mockContext(user: any, roles: any[]): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  it('allows when no roles required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'candidate' }, []))).toBe(true);
  });

  it('allows when user role matches', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin', 'recruiter']);
    expect(guard.canActivate(mockContext({ role: 'admin' }, []))).toBe(true);
  });

  it('rejects when user role mismatches', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    expect(() => guard.canActivate(mockContext({ role: 'candidate' }, []))).toThrow();
  });
});
```

- [ ] **Step 3: Implement RolesGuard**

```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test roles.guard`
Expected: 3 passed.

- [ ] **Step 5: Export from AuthModule**

In `apps/api/src/auth/auth.module.ts`, add `RolesGuard` to providers and exports.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/auth
git commit -m "feat(auth): add Roles decorator and RolesGuard"
```

---

## Task 3: Storage module (Cloudflare R2 via S3 SDK)

**Files:**
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/storage/storage.service.ts`
- Create: `apps/api/src/storage/storage.service.spec.ts`
- Modify: `apps/api/src/config/env.schema.ts`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Add R2 env vars to schema**

In `apps/api/src/config/env.schema.ts`, add:

```typescript
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  STORAGE_PROVIDER: z.enum(['mock', 'r2']).default('mock'),
```

Update `apps/api/.env.example` accordingly.

- [ ] **Step 2: Install AWS SDK for S3**

```powershell
pnpm --filter @worka/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 3: Write the failing test**

```typescript
import { StorageService } from './storage.service';

describe('StorageService (mock)', () => {
  beforeEach(() => { process.env.STORAGE_PROVIDER = 'mock'; });

  it('generates a mock signed upload URL', async () => {
    const svc = new StorageService();
    const result = await svc.getSignedUploadUrl({
      bucket: 'cv',
      key: 'user-1/cv.pdf',
      contentType: 'application/pdf',
      maxBytes: 5_000_000,
    });
    expect(result.uploadUrl).toContain('mock');
    expect(result.publicUrl).toContain('user-1/cv.pdf');
  });

  it('rejects unsupported content type', async () => {
    const svc = new StorageService();
    await expect(svc.getSignedUploadUrl({
      bucket: 'cv', key: 'x', contentType: 'application/x-msdownload', maxBytes: 1,
    })).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run test, expect FAIL**

Run: `pnpm test storage.service`
Expected: FAIL.

- [ ] **Step 5: Implement StorageService**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_CV_MIMES = ['application/pdf'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export interface SignedUploadParams {
  bucket: 'cv' | 'logo';
  key: string;
  contentType: string;
  maxBytes: number;
}

@Injectable()
export class StorageService {
  private client?: S3Client;

  private getClient(): S3Client {
    if (this.client) return this.client;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    return this.client;
  }

  async getSignedUploadUrl(params: SignedUploadParams): Promise<{ uploadUrl: string; publicUrl: string }> {
    const allowed = params.bucket === 'cv' ? ALLOWED_CV_MIMES : ALLOWED_IMAGE_MIMES;
    if (!allowed.includes(params.contentType)) {
      throw new BadRequestException(`Content type ${params.contentType} not allowed for bucket ${params.bucket}`);
    }
    if (params.maxBytes <= 0 || params.maxBytes > 10_000_000) {
      throw new BadRequestException('maxBytes must be in [1, 10_000_000]');
    }

    if (process.env.STORAGE_PROVIDER === 'mock') {
      return {
        uploadUrl: `mock://upload/${params.bucket}/${params.key}`,
        publicUrl: `mock://public/${params.bucket}/${params.key}`,
      };
    }

    const bucketName = process.env.R2_BUCKET!;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${params.bucket}/${params.key}`,
      ContentType: params.contentType,
    });
    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: 600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${params.bucket}/${params.key}`;
    return { uploadUrl, publicUrl };
  }
}
```

- [ ] **Step 6: Create module**

```typescript
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 7: Run test, expect PASS**

Run: `pnpm test storage.service`
Expected: 2 passed.

- [ ] **Step 8: Wire into AppModule and commit**

Modify `apps/api/src/app.module.ts` to import `StorageModule`.

```powershell
git add apps/api/src apps/api/.env.example pnpm-lock.yaml
git commit -m "feat(storage): add R2/S3 storage service with mock fallback"
```

---

## Task 4: Domains CRUD (admin-managed referential)

**Files:**
- Create: `apps/api/src/domains/domains.module.ts`
- Create: `apps/api/src/domains/domains.controller.ts`
- Create: `apps/api/src/domains/domains.service.ts`
- Create: `apps/api/src/domains/domains.service.spec.ts`
- Create: `apps/api/src/domains/dto/create-domain.dto.ts`
- Create: `apps/api/test/domains.e2e-spec.ts`

- [ ] **Step 1: Write the failing service test**

```typescript
import { DomainsService } from './domains.service';
import { PrismaService } from '../common/prisma.service';

describe('DomainsService', () => {
  let prisma: PrismaService;
  let svc: DomainsService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    svc = new DomainsService(prisma);
  });

  afterAll(async () => {
    await prisma.domain.deleteMany();
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => { await prisma.domain.deleteMany(); });

  it('creates a domain', async () => {
    const d = await svc.create({ nameFr: 'Tech', nameEn: 'Tech', icon: '💻' });
    expect(d.nameFr).toBe('Tech');
  });

  it('lists domains alphabetically', async () => {
    await svc.create({ nameFr: 'Santé' });
    await svc.create({ nameFr: 'Agriculture' });
    const list = await svc.list();
    expect(list[0].nameFr).toBe('Agriculture');
    expect(list[1].nameFr).toBe('Santé');
  });

  it('updates a domain', async () => {
    const d = await svc.create({ nameFr: 'Tech' });
    const updated = await svc.update(d.id, { nameFr: 'Technologie' });
    expect(updated.nameFr).toBe('Technologie');
  });

  it('deletes a domain', async () => {
    const d = await svc.create({ nameFr: 'Tech' });
    await svc.remove(d.id);
    expect(await prisma.domain.findUnique({ where: { id: d.id } })).toBeNull();
  });
});
```

- [ ] **Step 2: Create DTOs**

`apps/api/src/domains/dto/create-domain.dto.ts`:

```typescript
import { z } from 'zod';

export const createDomainSchema = z.object({
  nameFr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80).optional(),
  icon: z.string().max(8).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateDomainSchema = createDomainSchema.partial();

export type CreateDomainDto = z.infer<typeof createDomainSchema>;
export type UpdateDomainDto = z.infer<typeof updateDomainSchema>;
```

- [ ] **Step 3: Implement service**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDomainDto, UpdateDomainDto } from './dto/create-domain.dto';

@Injectable()
export class DomainsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDomainDto) {
    return this.prisma.domain.create({ data });
  }

  list() {
    return this.prisma.domain.findMany({ orderBy: { nameFr: 'asc' } });
  }

  async findOne(id: string) {
    const d = await this.prisma.domain.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Domain not found');
    return d;
  }

  async update(id: string, data: UpdateDomainDto) {
    await this.findOne(id);
    return this.prisma.domain.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.domain.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test domains.service`
Expected: 4 passed.

- [ ] **Step 5: Implement controller**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DomainsService } from './domains.service';
import { createDomainSchema, updateDomainSchema } from './dto/create-domain.dto';

@Controller('domains')
export class DomainsController {
  constructor(private readonly svc: DomainsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: unknown) {
    const parsed = createDomainSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(parsed.data);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateDomainSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.update(id, parsed.data);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
```

- [ ] **Step 6: Create module and wire**

```typescript
import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
```

Add `DomainsModule` to `AppModule.imports`.

- [ ] **Step 7: E2E test**

Create `apps/api/test/domains.e2e-spec.ts` testing:
- `GET /domains` (200, empty list)
- `POST /domains` without token (401)
- `POST /domains` as candidate (403)
- `POST /domains` as admin (200, creates)

(Use a helper that creates an admin user directly in DB and signs a JWT for them. Reuse the pattern from `auth.e2e-spec.ts`.)

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src/domains apps/api/test/domains.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(domains): add admin CRUD for domain referential"
```

---

## Task 5: Skills CRUD (admin-managed)

Identical pattern to Domains. Create:
- `apps/api/src/skills/skills.module.ts`
- `apps/api/src/skills/skills.controller.ts` — `GET /skills?domainId=...`, `POST /skills` (admin), `PATCH /skills/:id` (admin), `DELETE /skills/:id` (admin)
- `apps/api/src/skills/skills.service.ts` with `create`, `list({ domainId? })`, `findOne`, `update`, `remove`
- `apps/api/src/skills/dto/skill.dto.ts` with `createSkillSchema = z.object({ name: z.string().min(1), domainId: z.string().uuid().optional() })`

- [ ] **Step 1: Write service unit tests** (same pattern as DomainsService.spec)
- [ ] **Step 2: Implement service**
- [ ] **Step 3: Implement controller with RBAC**
- [ ] **Step 4: Wire module into AppModule**
- [ ] **Step 5: E2E test**
- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/skills apps/api/test/skills.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(skills): add admin CRUD for skill referential"
```

---

## Task 6: CandidateProfile endpoints (self-service)

**Files:**
- Create: `apps/api/src/profiles/profiles.module.ts`
- Create: `apps/api/src/profiles/candidate-profile.controller.ts`
- Create: `apps/api/src/profiles/candidate-profile.service.ts`
- Create: `apps/api/src/profiles/dto/candidate-profile.dto.ts`

- [ ] **Step 1: DTO**

```typescript
import { z } from 'zod';

export const upsertCandidateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  summary: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  cvUrl: z.string().url().optional(),
});
export type UpsertCandidateProfileDto = z.infer<typeof upsertCandidateProfileSchema>;

export const setDomainsSchema = z.object({
  domainIds: z.array(z.string().uuid()).length(3),
});
export type SetDomainsDto = z.infer<typeof setDomainsSchema>;
```

- [ ] **Step 2: Service**

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpsertCandidateProfileDto } from './dto/candidate-profile.dto';

@Injectable()
export class CandidateProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    return this.prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async update(userId: string, data: UpsertCandidateProfileDto) {
    return this.prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async setDomains(userId: string, domainIds: string[]) {
    if (new Set(domainIds).size !== 3) {
      throw new BadRequestException('domainIds must contain exactly 3 distinct IDs');
    }
    const found = await this.prisma.domain.findMany({ where: { id: { in: domainIds } } });
    if (found.length !== 3) {
      throw new BadRequestException('One or more domainIds do not exist');
    }
    await this.prisma.$transaction([
      this.prisma.userDomain.deleteMany({ where: { userId } }),
      ...domainIds.map((domainId, i) =>
        this.prisma.userDomain.create({ data: { userId, domainId, priority: i + 1 } }),
      ),
    ]);
    return this.prisma.userDomain.findMany({
      where: { userId },
      include: { domain: true },
      orderBy: { priority: 'asc' },
    });
  }

  async getDomains(userId: string) {
    return this.prisma.userDomain.findMany({
      where: { userId },
      include: { domain: true },
      orderBy: { priority: 'asc' },
    });
  }
}
```

- [ ] **Step 3: Controller**

```typescript
import { Body, Controller, Get, Patch, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { CandidateProfileService } from './candidate-profile.service';
import { upsertCandidateProfileSchema, setDomainsSchema } from './dto/candidate-profile.dto';

@Controller('me/candidate-profile')
@UseGuards(JwtGuard, RolesGuard)
@Roles('candidate')
export class CandidateProfileController {
  constructor(private readonly svc: CandidateProfileService) {}

  @Get()
  get(@CurrentUser() u: AccessPayload) {
    return this.svc.getOrCreate(u.sub);
  }

  @Patch()
  update(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = upsertCandidateProfileSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.update(u.sub, parsed.data);
  }

  @Get('domains')
  getDomains(@CurrentUser() u: AccessPayload) {
    return this.svc.getDomains(u.sub);
  }

  @Put('domains')
  setDomains(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = setDomainsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.setDomains(u.sub, parsed.data.domainIds);
  }
}
```

- [ ] **Step 4: Module + wire**

```typescript
import { Module } from '@nestjs/common';
import { CandidateProfileController } from './candidate-profile.controller';
import { CandidateProfileService } from './candidate-profile.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CandidateProfileController],
  providers: [CandidateProfileService],
  exports: [CandidateProfileService],
})
export class ProfilesModule {}
```

Wire into AppModule.

- [ ] **Step 5: E2E tests** — at minimum :
- GET profile when none exists → returns one (auto-created)
- PATCH updates fields
- PUT domains with 3 ids → returns 3 entries ordered by priority
- PUT domains with 2 ids → 400

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/profiles apps/api/test/profiles.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(profiles): candidate profile self-service + 3-domain selection"
```

---

## Task 7: CV upload endpoint (signed URL)

**Files:**
- Modify: `apps/api/src/profiles/candidate-profile.controller.ts`
- Modify: `apps/api/src/profiles/candidate-profile.service.ts`

- [ ] **Step 1: Add to service**

```typescript
import { StorageService } from '../storage/storage.service';

// in constructor:
constructor(
  private readonly prisma: PrismaService,
  private readonly storage: StorageService,
) {}

async getCvUploadUrl(userId: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const key = `${userId}/cv-${Date.now()}.pdf`;
  return this.storage.getSignedUploadUrl({
    bucket: 'cv',
    key,
    contentType: 'application/pdf',
    maxBytes: 5_000_000,
  });
}

async setCvUrl(userId: string, publicUrl: string) {
  return this.prisma.candidateProfile.update({
    where: { userId },
    data: { cvUrl: publicUrl },
  });
}
```

- [ ] **Step 2: Add endpoint**

```typescript
@Post('cv-upload-url')
async cvUploadUrl(@CurrentUser() u: AccessPayload) {
  return this.svc.getCvUploadUrl(u.sub);
}

@Patch('cv')
async setCv(@CurrentUser() u: AccessPayload, @Body() body: { cvUrl: string }) {
  return this.svc.setCvUrl(u.sub, body.cvUrl);
}
```

- [ ] **Step 3: E2E test** — POST returns `uploadUrl` and `publicUrl`. PATCH `cv` updates the profile.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/src/profiles apps/api/test/profiles.e2e-spec.ts
git commit -m "feat(profiles): add CV upload via signed R2 URL"
```

---

## Task 8: RecruiterProfile + Company creation

**Files:**
- Create: `apps/api/src/profiles/recruiter-profile.controller.ts`
- Create: `apps/api/src/profiles/recruiter-profile.service.ts`
- Create: `apps/api/src/companies/companies.module.ts`
- Create: `apps/api/src/companies/companies.service.ts`
- Create: `apps/api/src/companies/companies.controller.ts`

Behavior:
- When a user signs in for the first time as recruiter (via separate endpoint they declare their role) they create their company in the same step.
- `POST /me/recruiter-profile/setup` — body: `{ company: { name, sector, country, city? }, roleInCompany }` → creates company in `pending` state + creates recruiter profile linked to it + flips user role from `candidate` to `recruiter`.
- Admin can `PATCH /companies/:id/verify` to mark a company verified (we won't have admin features built yet beyond domains/skills, so this endpoint is for now admin-only and returns the company).

- [ ] **Step 1: Write recruiter setup service test**

(Test that calling setup creates Company + RecruiterProfile, sets user role.)

- [ ] **Step 2: Implement RecruiterProfileService.setup**

```typescript
async setup(userId: string, data: { company: { name: string; sector: string; country: string; city?: string }; roleInCompany: string }) {
  return this.prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { ...data.company } });
    await tx.user.update({ where: { id: userId }, data: { role: 'recruiter' } });
    const profile = await tx.recruiterProfile.create({
      data: { userId, companyId: company.id, roleInCompany: data.roleInCompany },
    });
    return { company, profile };
  });
}
```

- [ ] **Step 3: CompaniesService (admin-only minimal CRUD)**

```typescript
@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } }); }
  get(id: string) { return this.prisma.company.findUniqueOrThrow({ where: { id } }); }
  verify(id: string, adminId: string) {
    return this.prisma.company.update({ where: { id }, data: { verifiedByAdminId: adminId } });
  }
}
```

- [ ] **Step 4: Controllers (with RBAC)**

`RecruiterProfileController` requires JWT; `CompaniesController` requires `admin`.

- [ ] **Step 5: E2E tests + commit**

```powershell
git add apps/api/src/profiles apps/api/src/companies apps/api/test apps/api/src/app.module.ts
git commit -m "feat(profiles): recruiter setup with company creation + admin company verify"
```

---

## Task 9: Jobs CRUD (recruiter posts, admin moderates)

**Files:**
- Create: `apps/api/src/jobs/jobs.module.ts`
- Create: `apps/api/src/jobs/jobs.controller.ts`
- Create: `apps/api/src/jobs/jobs.service.ts`
- Create: `apps/api/src/jobs/dto/job.dto.ts`

Endpoints:
- `POST /jobs` (recruiter) — creates job in `draft`
- `POST /jobs/:id/submit` (recruiter) — moves `draft` → `pending` (modération)
- `POST /jobs/:id/publish` (admin) — `pending` → `published`, sets `publishedAt`
- `POST /jobs/:id/reject` (admin) — `pending` → `closed` (with reason in audit log later)
- `GET /jobs/:id` (any)
- `GET /jobs?status=&country=&domainId=` (any)
- `PATCH /jobs/:id` (recruiter, only own jobs in `draft`)
- `DELETE /jobs/:id` (admin or owning recruiter on draft)

- [ ] **Step 1: DTO**

```typescript
import { z } from 'zod';

export const createJobSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(5000),
  domainId: z.string().uuid(),
  skillIds: z.array(z.string().uuid()).max(15).default([]),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().length(3).default('GNF'),
  location: z.string().max(120).optional(),
  country: z.string().length(2),
  type: z.enum(['cdi', 'cdd', 'stage', 'freelance']),
  deadline: z.string().datetime().optional(),
});

export const updateJobSchema = createJobSchema.partial();
export type CreateJobDto = z.infer<typeof createJobSchema>;
```

- [ ] **Step 2: Service**

```typescript
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateJobDto) {
    const rp = await this.prisma.recruiterProfile.findUniqueOrThrow({ where: { userId } });
    if (rp.companyId !== data.companyId) throw new ForbiddenException('Not your company');
    const { skillIds, ...rest } = data;
    return this.prisma.job.create({
      data: {
        ...rest,
        postedByUserId: userId,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        jobSkills: { create: skillIds.map((id) => ({ skillId: id })) },
      },
      include: { jobSkills: { include: { skill: true } } },
    });
  }

  async submit(userId: string, jobId: string) {
    const job = await this.prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    if (job.postedByUserId !== userId) throw new ForbiddenException();
    if (job.status !== 'draft') throw new BadRequestException('Only draft jobs can be submitted');
    return this.prisma.job.update({ where: { id: jobId }, data: { status: 'pending' } });
  }

  async publish(jobId: string) {
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async reject(jobId: string) {
    return this.prisma.job.update({ where: { id: jobId }, data: { status: 'closed' } });
  }

  async findOne(id: string) {
    return this.prisma.job.findUniqueOrThrow({
      where: { id },
      include: { company: true, domain: true, jobSkills: { include: { skill: true } } },
    });
  }

  list(filter: { status?: string; country?: string; domainId?: string }) {
    return this.prisma.job.findMany({
      where: {
        status: filter.status as any,
        country: filter.country,
        domainId: filter.domainId,
      },
      orderBy: { publishedAt: 'desc' },
      include: { company: true, domain: true },
      take: 50,
    });
  }
}
```

- [ ] **Step 3: Controller** with appropriate `@Roles()` guards for each action
- [ ] **Step 4: E2E tests** : recruiter creates draft → submits → admin publishes → GET /jobs returns it
- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/jobs apps/api/test/jobs.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(jobs): draft/submit/publish lifecycle with role-based gating"
```

---

## Task 10: Match scoring utility

**Files:**
- Create: `apps/api/src/feed/match.util.ts`
- Create: `apps/api/src/feed/match.util.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { computeMatchScore } from './match.util';

describe('computeMatchScore', () => {
  it('100 when everything matches', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1', 'd2', 'd3'],
      candidateCountry: 'GN',
      candidateSkillIds: ['s1', 's2', 's3'],
      job: { domainId: 'd1', country: 'GN', skillIds: ['s1', 's2', 's3'] },
    });
    expect(score).toBe(100);
  });

  it('drops when domain mismatch', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1', 'd2', 'd3'],
      candidateCountry: 'GN',
      candidateSkillIds: ['s1'],
      job: { domainId: 'dX', country: 'GN', skillIds: ['s1'] },
    });
    expect(score).toBeLessThan(60);
  });

  it('drops when country mismatch', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1'],
      candidateCountry: 'GN',
      candidateSkillIds: [],
      job: { domainId: 'd1', country: 'SN', skillIds: [] },
    });
    expect(score).toBeLessThan(80);
  });

  it('clamps between 0 and 100', () => {
    const score = computeMatchScore({
      candidateDomainIds: [], candidateCountry: 'GN', candidateSkillIds: [],
      job: { domainId: 'd1', country: 'XX', skillIds: ['s1', 's2'] },
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
export interface MatchInputs {
  candidateDomainIds: string[];
  candidateCountry: string | null;
  candidateSkillIds: string[];
  job: {
    domainId: string;
    country: string;
    skillIds: string[];
  };
}

// Weights tuned to give: domain match 40%, country match 30%, skill overlap 30%.
export function computeMatchScore(i: MatchInputs): number {
  const domainMatch = i.candidateDomainIds.includes(i.job.domainId) ? 1 : 0;
  const countryMatch = i.candidateCountry === i.job.country ? 1 : 0;

  let skillMatch = 0;
  if (i.job.skillIds.length > 0) {
    const overlap = i.job.skillIds.filter((s) => i.candidateSkillIds.includes(s)).length;
    skillMatch = overlap / i.job.skillIds.length;
  } else {
    skillMatch = 0.5;
  }

  const score = (domainMatch * 40) + (countryMatch * 30) + (skillMatch * 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

- [ ] **Step 3: Run tests, commit**

```powershell
git add apps/api/src/feed
git commit -m "feat(feed): add deterministic match scoring utility"
```

---

## Task 11: Feed endpoint (swipe stack)

**Files:**
- Create: `apps/api/src/feed/feed.module.ts`
- Create: `apps/api/src/feed/feed.controller.ts`
- Create: `apps/api/src/feed/feed.service.ts`

- [ ] **Step 1: Implement FeedService**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { computeMatchScore } from './match.util';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeedForCandidate(userId: string, limit = 10) {
    const [user, userDomains, alreadySwiped] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.userDomain.findMany({ where: { userId } }),
      this.prisma.swipe.findMany({ where: { candidateUserId: userId }, select: { jobId: true } }),
    ]);
    const domainIds = userDomains.map((d) => d.domainId);
    const swipedJobIds = alreadySwiped.map((s) => s.jobId);

    const candidateJobs = await this.prisma.job.findMany({
      where: {
        status: 'published',
        domainId: { in: domainIds.length > 0 ? domainIds : undefined },
        country: user.countryCode ?? undefined,
        id: { notIn: swipedJobIds.length > 0 ? swipedJobIds : undefined },
      },
      include: {
        company: true,
        domain: true,
        jobSkills: { include: { skill: true } },
      },
      take: limit * 3,
      orderBy: { publishedAt: 'desc' },
    });

    const scored = candidateJobs.map((job) => ({
      job,
      matchScore: computeMatchScore({
        candidateDomainIds: domainIds,
        candidateCountry: user.countryCode,
        candidateSkillIds: [],
        job: {
          domainId: job.domainId,
          country: job.country,
          skillIds: job.jobSkills.map((js) => js.skillId),
        },
      }),
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }
}
```

- [ ] **Step 2: Controller**

```typescript
@Controller('jobs/feed')
@UseGuards(JwtGuard, RolesGuard)
@Roles('candidate')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  get(@CurrentUser() u: AccessPayload, @Query('limit') limit?: string) {
    return this.feed.getFeedForCandidate(u.sub, Math.min(50, Number(limit ?? 10)));
  }
}
```

- [ ] **Step 3: Module + wire**

- [ ] **Step 4: E2E test** : create domains, create job in domain X country GN, create candidate with that domain and country, GET /jobs/feed returns the job with `matchScore` ≥ 70.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/feed apps/api/test/feed.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(feed): personalized swipe stack with match scoring"
```

---

## Task 12: Swipes endpoint

**Files:**
- Create: `apps/api/src/swipes/swipes.module.ts`
- Create: `apps/api/src/swipes/swipes.controller.ts`
- Create: `apps/api/src/swipes/swipes.service.ts`

Endpoints (candidate only):
- `POST /swipes` body `{ jobId, direction }` → records swipe (upserted by unique constraint)
- `GET /swipes/saved` → list swipes with direction=saved

- [ ] **Step 1: Implement**

```typescript
@Injectable()
export class SwipesService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, jobId: string, direction: 'left' | 'right' | 'saved', matchScore?: number) {
    return this.prisma.swipe.upsert({
      where: { candidateUserId_jobId: { candidateUserId: userId, jobId } },
      create: { candidateUserId: userId, jobId, direction, matchScoreAtSwipe: matchScore },
      update: { direction, matchScoreAtSwipe: matchScore },
    });
  }

  listSaved(userId: string) {
    return this.prisma.swipe.findMany({
      where: { candidateUserId: userId, direction: 'saved' },
      include: { job: { include: { company: true, domain: true } } },
      orderBy: { swipedAt: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Controller + module + e2e + commit**

```powershell
git add apps/api/src/swipes apps/api/test/swipes.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(swipes): record swipes and list saved jobs"
```

---

## Task 13: Applications endpoint

**Files:**
- Create: `apps/api/src/applications/applications.module.ts`
- Create: `apps/api/src/applications/applications.controller.ts`
- Create: `apps/api/src/applications/applications.service.ts`

Endpoints:
- `POST /applications` (candidate) body `{ jobId, coverLetterUrl? }` → creates Application + records a `right` swipe + increments `job.applicationCount`
- `GET /applications/mine` (candidate) → list candidate's applications
- `GET /jobs/:jobId/applications` (recruiter, only own jobs) → list applications for a job
- `PATCH /applications/:id/status` (recruiter, only their job's apps) body `{ status }`

- [ ] **Step 1: Implement ApplicationsService**

```typescript
@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(candidateUserId: string, jobId: string, coverLetterUrl?: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
      if (job.status !== 'published') throw new BadRequestException('Job not published');

      const application = await tx.application.upsert({
        where: { jobId_candidateUserId: { jobId, candidateUserId } },
        create: { jobId, candidateUserId, coverLetterUrl, appliedVia: 'manual' },
        update: {},
      });

      await tx.swipe.upsert({
        where: { candidateUserId_jobId: { candidateUserId, jobId } },
        create: { candidateUserId, jobId, direction: 'right' },
        update: { direction: 'right' },
      });

      await tx.job.update({ where: { id: jobId }, data: { applicationCount: { increment: 1 } } });
      return application;
    });
  }

  listMine(candidateUserId: string) {
    return this.prisma.application.findMany({
      where: { candidateUserId },
      include: { job: { include: { company: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async listForJob(jobId: string, recruiterUserId: string) {
    const job = await this.prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    if (job.postedByUserId !== recruiterUserId) throw new ForbiddenException();
    return this.prisma.application.findMany({
      where: { jobId },
      include: { candidate: { include: { candidateProfile: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateStatus(applicationId: string, recruiterUserId: string, status: string) {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { job: true },
    });
    if (app.job.postedByUserId !== recruiterUserId) throw new ForbiddenException();
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: status as any,
        recruiterViewedAt: status !== 'pending' ? new Date() : app.recruiterViewedAt,
      },
    });
  }
}
```

- [ ] **Step 2: Controller, module, e2e, commit**

```powershell
git add apps/api/src/applications apps/api/test/applications.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(applications): apply, list mine, recruiter review with status updates"
```

---

## Task 14: Throttling on hot endpoints

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/applications/applications.controller.ts`

- [ ] **Step 1: Install throttler**

```powershell
pnpm --filter @worka/api add @nestjs/throttler
```

- [ ] **Step 2: Wire ThrottlerModule in AppModule**

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// in @Module imports:
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]), // default 30 req/min per user

// in providers:
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

- [ ] **Step 3: Tighten on auth endpoints**

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 3, ttl: 60_000 } })
@Post('send-otp')
async sendOtp(...) {...}
```

Apply similar limit on `POST /applications` (e.g., 30 per minute) — the OTP service already has its own throttle layered on top.

- [ ] **Step 4: Verify with curl loop**

Quick manual check that 4th `send-otp` in a minute returns 429.

- [ ] **Step 5: Commit**

```powershell
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): add throttling on send-otp and applications"
git tag -a backend-1b-entities-done -m "Backend 1B: core entities complete"
```

---

## Done criteria for Plan 1B

- All tests pass (`pnpm api:test && pnpm api:test:e2e`).
- A candidate can pick 3 domains, see a personalized feed at `/jobs/feed`, swipe right via `/applications`, and see their applications at `/applications/mine`.
- A recruiter can post a job (draft → submit → admin publishes) and see incoming applications for their jobs.
- Admin can CRUD domains and skills, and verify companies.
- Throttling is active on `send-otp`.

Move to Plan 1C for payment, audit logs, and real-time chat.
