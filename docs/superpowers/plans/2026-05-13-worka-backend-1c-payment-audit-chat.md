# Worka Backend 1C — Payment + Audit + Chat WebSocket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Orange Money payment integration (CinetPay), complete audit logging on sensitive actions, and a working WebSocket chat between matched candidates and recruiters.

**Architecture:** Payments via CinetPay sandbox with HMAC-signed webhooks. Transactions table uses idempotency keys. Audit logging via a NestJS interceptor that taps controller responses. Chat via `@nestjs/websockets` + `socket.io`, JWT-authenticated on handshake, rooms per conversation, FCM fallback when offline (stub for v1).

**Tech Stack:** Same as 1A/1B + `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io` + `@nestjs/bullmq` (workers, optional in 1C).

**Prerequisite:** Plan 1B complete and tagged `backend-1b-entities-done`.

---

## File Structure (additions)

```
apps/api/src/
├── payments/
│   ├── payments.module.ts
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── cinetpay.client.ts
│   ├── webhook.signature.ts
│   └── dto/...
├── pricing/
│   ├── pricing.module.ts
│   ├── pricing.controller.ts
│   └── pricing.service.ts
├── audit/
│   ├── audit.module.ts
│   ├── audit.service.ts
│   └── audit.interceptor.ts
└── chat/
    ├── chat.module.ts
    ├── chat.gateway.ts
    ├── chat.service.ts
    └── ws-jwt.guard.ts
```

---

## Task 1: Extend Prisma schema with Transaction, Subscription, PricingConfig, AuditLog, Conversation, Message

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Append models**

```prisma
enum TransactionType {
  recruiter_offer
  recruiter_sub
  candidate_premium
}

enum TransactionStatus {
  pending
  success
  failed
  refunded
}

model Transaction {
  id              String              @id @default(uuid())
  userId          String              @map("user_id")
  type            TransactionType
  amount          Int
  currency        String              @default("GNF")
  status          TransactionStatus   @default(pending)
  provider        String              @default("orange_money")
  providerRef     String?             @map("provider_ref")
  idempotencyKey  String              @unique @map("idempotency_key")
  metadata        Json?
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@map("transactions")
}

model Subscription {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  plan        String
  startedAt   DateTime @default(now()) @map("started_at")
  expiresAt   DateTime @map("expires_at")
  autoRenew   Boolean  @default(false) @map("auto_renew")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@map("subscriptions")
}

model PricingConfig {
  key             String   @id
  value           Int
  currency        String   @default("GNF")
  updatedByAdminId String? @map("updated_by_admin_id")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("pricing_config")
}

model AuditLog {
  id          String   @id @default(uuid())
  actorId     String?  @map("actor_id")
  action      String
  targetType  String?  @map("target_type")
  targetId    String?  @map("target_id")
  payload     Json?
  ip          String?
  userAgent   String?  @map("user_agent")
  at          DateTime @default(now())

  @@index([actorId, at])
  @@index([action, at])
  @@map("audit_logs")
}

model Conversation {
  id              String   @id @default(uuid())
  candidateUserId String   @map("candidate_user_id")
  recruiterUserId String   @map("recruiter_user_id")
  jobId           String   @map("job_id")
  lastMessageAt   DateTime? @map("last_message_at")
  createdAt       DateTime @default(now()) @map("created_at")

  candidate       User     @relation("CandidateConversations", fields: [candidateUserId], references: [id], onDelete: Cascade)
  recruiter       User     @relation("RecruiterConversations", fields: [recruiterUserId], references: [id], onDelete: Cascade)
  job             Job      @relation(fields: [jobId], references: [id])
  messages        Message[]

  @@unique([candidateUserId, recruiterUserId, jobId])
  @@map("conversations")
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String       @map("conversation_id")
  senderId        String       @map("sender_id")
  content         String
  attachmentUrl   String?      @map("attachment_url")
  sentAt          DateTime     @default(now()) @map("sent_at")
  readAt          DateTime?    @map("read_at")

  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender          User         @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId, sentAt])
  @@map("messages")
}
```

Update `User` model with the new back-relations:

```prisma
model User {
  // ... existing fields ...
  transactions             Transaction[]
  subscriptions            Subscription[]
  candidateConversations   Conversation[] @relation("CandidateConversations")
  recruiterConversations   Conversation[] @relation("RecruiterConversations")
  messages                 Message[]
}
```

- [ ] **Step 2: Migrate**

Run: `pnpm prisma:migrate -- --name payments_audit_chat`
Expected: success, new tables created.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/prisma
git commit -m "feat(db): add transactions, subscriptions, pricing, audit, chat tables"
```

---

## Task 2: PricingConfig admin endpoints

**Files:**
- Create: `apps/api/src/pricing/pricing.module.ts`
- Create: `apps/api/src/pricing/pricing.controller.ts`
- Create: `apps/api/src/pricing/pricing.service.ts`

Endpoints:
- `GET /pricing` (any auth) — returns all pricing keys
- `PUT /pricing/:key` (admin) body `{ value: number, currency?: string }` — upsert pricing

- [ ] **Step 1: Service**

```typescript
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.pricingConfig.findMany(); }
  get(key: string) { return this.prisma.pricingConfig.findUnique({ where: { key } }); }

  upsert(key: string, value: number, currency: string, adminId: string) {
    return this.prisma.pricingConfig.upsert({
      where: { key },
      create: { key, value, currency, updatedByAdminId: adminId },
      update: { value, currency, updatedByAdminId: adminId },
    });
  }
}
```

- [ ] **Step 2: Controller**

```typescript
@Controller('pricing')
@UseGuards(JwtGuard)
export class PricingController {
  constructor(private readonly svc: PricingService) {}

  @Get()
  list() { return this.svc.list(); }

  @Put(':key')
  @UseGuards(RolesGuard)
  @Roles('admin')
  upsert(
    @Param('key') key: string,
    @CurrentUser() u: AccessPayload,
    @Body() body: { value: number; currency?: string },
  ) {
    return this.svc.upsert(key, body.value, body.currency ?? 'GNF', u.sub);
  }
}
```

- [ ] **Step 3: Seed minimum pricing**

Create `apps/api/prisma/seed-pricing.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const seed = [
    { key: 'recruiter.offer.price', value: 200_000, currency: 'GNF' },
    { key: 'recruiter.sub.monthly', value: 500_000, currency: 'GNF' },
    { key: 'candidate.premium.monthly', value: 30_000, currency: 'GNF' },
  ];
  for (const item of seed) {
    await p.pricingConfig.upsert({ where: { key: item.key }, create: item, update: {} });
  }
}
main().finally(() => p.$disconnect());
```

Add to `apps/api/package.json` scripts: `"seed:pricing": "tsx prisma/seed-pricing.ts"` and install: `pnpm --filter @worka/api add -D tsx`.

Run: `pnpm --filter @worka/api seed:pricing`
Expected: 3 rows in `pricing_config`.

- [ ] **Step 4: E2E test + commit**

```powershell
git add apps/api/src/pricing apps/api/prisma/seed-pricing.ts apps/api/package.json pnpm-lock.yaml apps/api/test/pricing.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(pricing): admin pricing config with seed for default prices"
```

---

## Task 3: CinetPay webhook signature verification

**Files:**
- Create: `apps/api/src/payments/webhook.signature.ts`
- Create: `apps/api/src/payments/webhook.signature.spec.ts`

- [ ] **Step 1: Test**

```typescript
import { verifyCinetPaySignature } from './webhook.signature';
import { createHmac } from 'crypto';

describe('verifyCinetPaySignature', () => {
  const secret = 'test_secret_key';
  const payload = '{"transaction_id":"abc","status":"ACCEPTED"}';
  const validSignature = createHmac('sha256', secret).update(payload).digest('hex');

  beforeEach(() => { process.env.CINETPAY_SECRET_KEY = secret; });

  it('accepts a valid signature', () => {
    expect(verifyCinetPaySignature(payload, validSignature)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyCinetPaySignature(payload, 'badsignature')).toBe(false);
  });

  it('rejects when signature is missing', () => {
    expect(verifyCinetPaySignature(payload, '')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyCinetPaySignature(rawBody: string, providedSignature: string): boolean {
  const secret = process.env.CINETPAY_SECRET_KEY;
  if (!secret || !providedSignature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(providedSignature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 3: Run test, commit**

```powershell
git add apps/api/src/payments
git commit -m "feat(payments): add CinetPay HMAC webhook signature verification"
```

---

## Task 4: CinetPay client (sandbox-first)

**Files:**
- Create: `apps/api/src/payments/cinetpay.client.ts`
- Create: `apps/api/src/payments/cinetpay.client.spec.ts`

- [ ] **Step 1: Add env vars**

In `apps/api/src/config/env.schema.ts`, add:

```typescript
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
  CINETPAY_SECRET_KEY: z.string().optional(),
  CINETPAY_BASE_URL: z.string().url().default('https://api-checkout.cinetpay.com/v2'),
  CINETPAY_MODE: z.enum(['mock', 'sandbox', 'live']).default('mock'),
  CINETPAY_NOTIFY_URL: z.string().url().optional(),
  CINETPAY_RETURN_URL: z.string().url().optional(),
```

Update `.env.example` accordingly.

- [ ] **Step 2: Test**

```typescript
import { CinetPayClient } from './cinetpay.client';

describe('CinetPayClient (mock)', () => {
  beforeEach(() => { process.env.CINETPAY_MODE = 'mock'; });

  it('returns a mock payment URL', async () => {
    const client = new CinetPayClient();
    const result = await client.initPayment({
      transactionId: 'tx-1',
      amount: 200_000,
      currency: 'GNF',
      description: 'Test offer',
      customerPhone: '+224622123456',
    });
    expect(result.paymentUrl).toContain('mock');
    expect(result.providerRef).toBeTruthy();
  });
});
```

- [ ] **Step 3: Implement**

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface InitPaymentParams {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerPhone: string;
}

export interface InitPaymentResult {
  paymentUrl: string;
  providerRef: string;
}

@Injectable()
export class CinetPayClient {
  private readonly logger = new Logger(CinetPayClient.name);

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const mode = process.env.CINETPAY_MODE ?? 'mock';

    if (mode === 'mock') {
      return {
        paymentUrl: `mock://cinetpay/pay?tx=${params.transactionId}`,
        providerRef: `mock-${params.transactionId}`,
      };
    }

    const baseUrl = process.env.CINETPAY_BASE_URL!;
    const apiKey = process.env.CINETPAY_API_KEY!;
    const siteId = process.env.CINETPAY_SITE_ID!;
    const notifyUrl = process.env.CINETPAY_NOTIFY_URL!;
    const returnUrl = process.env.CINETPAY_RETURN_URL!;

    const body = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      notify_url: notifyUrl,
      return_url: returnUrl,
      channels: 'MOBILE_MONEY',
      customer_phone_number: params.customerPhone,
    };

    const res = await fetch(`${baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`CinetPay init failed: ${res.status}`);
    const json = await res.json();
    return {
      paymentUrl: json.data?.payment_url ?? '',
      providerRef: json.data?.payment_token ?? params.transactionId,
    };
  }
}
```

- [ ] **Step 4: Commit**

```powershell
git add apps/api/src/payments apps/api/src/config apps/api/.env.example
git commit -m "feat(payments): add CinetPay client with mock and live modes"
```

---

## Task 5: PaymentsService — init transaction

**Files:**
- Create: `apps/api/src/payments/payments.service.ts`
- Create: `apps/api/src/payments/dto/init-payment.dto.ts`

- [ ] **Step 1: DTO**

```typescript
import { z } from 'zod';

export const initPaymentSchema = z.object({
  type: z.enum(['recruiter_offer', 'recruiter_sub', 'candidate_premium']),
  jobId: z.string().uuid().optional(),
});
export type InitPaymentDto = z.infer<typeof initPaymentSchema>;
```

- [ ] **Step 2: Service**

```typescript
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cinetpay: CinetPayClient,
    private readonly pricing: PricingService,
  ) {}

  async initPayment(userId: string, dto: InitPaymentDto): Promise<{ transactionId: string; paymentUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const priceKey = {
      recruiter_offer: 'recruiter.offer.price',
      recruiter_sub: 'recruiter.sub.monthly',
      candidate_premium: 'candidate.premium.monthly',
    }[dto.type];
    const pricing = await this.pricing.get(priceKey);
    if (!pricing) throw new BadRequestException(`Pricing for ${priceKey} not configured`);

    const idempotencyKey = `${userId}:${dto.type}:${dto.jobId ?? 'none'}:${Date.now()}`;

    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        amount: pricing.value,
        currency: pricing.currency,
        idempotencyKey,
        metadata: dto.jobId ? { jobId: dto.jobId } : undefined,
      },
    });

    const init = await this.cinetpay.initPayment({
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      description: `Worka ${dto.type}`,
      customerPhone: user.phone,
    });

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { providerRef: init.providerRef },
    });

    return { transactionId: tx.id, paymentUrl: init.paymentUrl };
  }
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/payments
git commit -m "feat(payments): init payment creates Transaction and returns CinetPay URL"
```

---

## Task 6: Webhook controller (CinetPay callbacks)

**Files:**
- Create: `apps/api/src/payments/payments.controller.ts`
- Modify: `apps/api/src/main.ts` (raw body for webhook signature)

- [ ] **Step 1: Configure raw body in main.ts**

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

(NestJS exposes `req.rawBody` when `rawBody: true` is set.)

- [ ] **Step 2: Controller**

```typescript
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('init')
  @UseGuards(JwtGuard)
  async init(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = initPaymentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.initPayment(u.sub, parsed.data);
  }

  @Post('webhook/cinetpay')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: any,
    @Headers('x-cinetpay-signature') signature: string,
    @Body() body: any,
  ) {
    const rawBody: string = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    if (!verifyCinetPaySignature(rawBody, signature ?? '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const transactionId = body.transaction_id;
    const status = body.status; // 'ACCEPTED' | 'REFUSED' | ...
    const providerRef = body.payment_token ?? transactionId;

    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) return { ok: true, note: 'unknown_transaction' };

    if (tx.status !== 'pending') return { ok: true, note: 'already_processed' };

    const newStatus = status === 'ACCEPTED' ? 'success' : status === 'REFUSED' ? 'failed' : tx.status;
    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { status: newStatus, providerRef },
    });

    if (newStatus === 'success') {
      await this.applySuccessSideEffects(updated);
    }
    return { ok: true };
  }

  private async applySuccessSideEffects(tx: { id: string; userId: string; type: string; metadata: any }) {
    if (tx.type === 'recruiter_offer' && tx.metadata?.jobId) {
      await this.prisma.job.update({
        where: { id: tx.metadata.jobId },
        data: { status: 'pending' }, // sent to admin moderation
      });
    } else if (tx.type === 'recruiter_sub') {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await this.prisma.subscription.create({
        data: { userId: tx.userId, plan: 'recruiter_monthly', expiresAt: expires },
      });
    } else if (tx.type === 'candidate_premium') {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await this.prisma.subscription.create({
        data: { userId: tx.userId, plan: 'candidate_premium_monthly', expiresAt: expires },
      });
      await this.prisma.candidateProfile.update({
        where: { userId: tx.userId },
        data: { isPremium: true, premiumUntil: expires, aiCreditsRemaining: 100 },
      });
    }
  }
}
```

- [ ] **Step 3: PaymentsModule + wire**

```typescript
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CinetPayClient } from './cinetpay.client';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CinetPayClient],
})
export class PaymentsModule {}
```

- [ ] **Step 4: E2E test**

In `apps/api/test/payments.e2e-spec.ts`:
- Recruiter `POST /payments/init` with `type=recruiter_offer, jobId=...` → returns `paymentUrl` + `transactionId`
- Simulate webhook: compute HMAC over `{transaction_id, status: 'ACCEPTED', payment_token: 'xyz'}` with the test secret, POST to `/payments/webhook/cinetpay` with the signature header → 200, transaction is now `success`, job status is `pending`.
- Webhook with wrong signature → 401.
- Webhook for unknown transaction → 200 with note.
- Replay (already-success transaction) → 200 with note `already_processed`.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/payments apps/api/src/main.ts apps/api/test/payments.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(payments): CinetPay webhook with signature verification and side effects"
```

---

## Task 7: AuditService and AuditInterceptor

**Files:**
- Create: `apps/api/src/audit/audit.service.ts`
- Create: `apps/api/src/audit/audit.interceptor.ts`
- Create: `apps/api/src/audit/audit.decorator.ts`
- Create: `apps/api/src/audit/audit.module.ts`

- [ ] **Step 1: AuditService**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface AuditEntry {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: unknown;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        payload: entry.payload as any,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  }
}
```

- [ ] **Step 2: @Audit() decorator + interceptor**

```typescript
// audit.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const AUDIT_KEY = 'audit';
export const Audit = (action: string, targetType?: string) => SetMetadata(AUDIT_KEY, { action, targetType });
```

```typescript
// audit.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<{ action: string; targetType?: string }>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const actorId = req.user?.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap((result) => {
        this.audit.log({
          actorId,
          action: meta.action,
          targetType: meta.targetType,
          targetId: typeof result === 'object' && result && 'id' in result ? (result as any).id : undefined,
          payload: { body: req.body, params: req.params },
          ip,
          userAgent,
        }).catch(() => {}); // do not block response on audit failure
      }),
    );
  }
}
```

- [ ] **Step 3: AuditModule**

```typescript
import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Global()
@Module({
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
```

- [ ] **Step 4: Apply `@Audit()` on sensitive endpoints**

In `domains.controller.ts`, `companies.controller.ts`, `jobs.controller.ts` (publish/reject), `pricing.controller.ts`, add:

```typescript
import { UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/audit.decorator';

@Post(':id/publish')
@UseGuards(JwtGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles('admin')
@Audit('job.publish', 'job')
publish(@Param('id') id: string) { ... }
```

- [ ] **Step 5: E2E test**

In `apps/api/test/audit.e2e-spec.ts`:
- Admin publishes a job → assert an audit log row exists with `action='job.publish'`, `actorId=adminId`, `targetId=jobId`.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/audit apps/api/src apps/api/test/audit.e2e-spec.ts
git commit -m "feat(audit): interceptor-based audit logging on sensitive admin actions"
```

---

## Task 8: WS-JWT guard for socket.io handshake

**Files:**
- Create: `apps/api/src/chat/ws-jwt.guard.ts`

- [ ] **Step 1: Install socket.io**

```powershell
pnpm --filter @worka/api add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

- [ ] **Step 2: Implement guard**

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService, AccessPayload } from '../auth/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization?.replace(/^Bearer\s+/, '');
    if (!token) throw new WsException('Missing token');
    try {
      const payload: AccessPayload = this.jwt.verifyAccess(token);
      (client as any).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/chat pnpm-lock.yaml
git commit -m "feat(chat): add WS JWT guard for socket.io handshake"
```

---

## Task 9: ChatService

**Files:**
- Create: `apps/api/src/chat/chat.service.ts`

- [ ] **Step 1: Implement**

```typescript
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(candidateUserId: string, recruiterUserId: string, jobId: string) {
    const application = await this.prisma.application.findUnique({
      where: { jobId_candidateUserId: { jobId, candidateUserId } },
    });
    if (!application) {
      throw new ForbiddenException('No application linking this candidate to this job');
    }
    return this.prisma.conversation.upsert({
      where: { candidateUserId_recruiterUserId_jobId: { candidateUserId, recruiterUserId, jobId } },
      create: { candidateUserId, recruiterUserId, jobId },
      update: {},
    });
  }

  async ensureCanParticipate(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
    if (conv.candidateUserId !== userId && conv.recruiterUserId !== userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  async listMessages(conversationId: string, userId: string) {
    await this.ensureCanParticipate(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      take: 200,
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    if (!content || content.trim().length === 0 || content.length > 4000) {
      throw new BadRequestException('Message content must be 1..4000 chars');
    }
    await this.ensureCanParticipate(conversationId, senderId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.sentAt },
    });
    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.ensureCanParticipate(conversationId, userId);
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async listMyConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { OR: [{ candidateUserId: userId }, { recruiterUserId: userId }] },
      include: {
        job: { include: { company: true } },
        candidate: { include: { candidateProfile: true } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Service tests** : at least the “candidate not linked to job ⇒ getOrCreateConversation throws” case.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/chat
git commit -m "feat(chat): chat service with conversation gating and message store"
```

---

## Task 10: Chat REST endpoints

**Files:**
- Create: `apps/api/src/chat/chat.controller.ts`

Endpoints:
- `GET /chat/conversations` (any auth) → list
- `POST /chat/conversations` body `{ candidateUserId, recruiterUserId, jobId }` (recruiter or candidate involved) → get-or-create
- `GET /chat/conversations/:id/messages` → list (last 200)
- `POST /chat/conversations/:id/messages` body `{ content }` (HTTP fallback) → send (also broadcasts via gateway if connected)
- `POST /chat/conversations/:id/read` → mark read

- [ ] **Step 1: Implement** with JwtGuard on all routes.

- [ ] **Step 2: E2E test** :
- Create application (candidate → job) → conversation auto-creatable
- Send message via HTTP → list shows it
- Other user sends message → conversation lastMessageAt updates
- Outsider tries to read → 403

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/chat apps/api/test/chat.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(chat): HTTP endpoints for conversations and messages"
```

---

## Task 11: ChatGateway (WebSocket)

**Files:**
- Create: `apps/api/src/chat/chat.gateway.ts`

- [ ] **Step 1: Implement**

```typescript
import {
  WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket,
  WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: true, credentials: true },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly chat: ChatService) {}

  async handleConnection(client: Socket) {
    // user populated by WsJwtGuard during canActivate when first message hits;
    // for handshake-time auth we run guard manually here
    const token = client.handshake.auth?.token;
    if (!token) { client.disconnect(true); return; }
    // The guard will run on each message; we can also pre-join rooms here once user is known after first event.
  }

  async handleDisconnect(_client: Socket) {}

  @SubscribeMessage('conversation:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const userId = (client as any).user?.sub;
    await this.chat.ensureCanParticipate(data.conversationId, userId);
    await client.join(`conversation:${data.conversationId}`);
    return { joined: data.conversationId };
  }

  @SubscribeMessage('message:send')
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; content: string }) {
    const userId = (client as any).user?.sub;
    const message = await this.chat.sendMessage(data.conversationId, userId, data.content);
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);
    return { sent: message.id };
  }

  @SubscribeMessage('message:read')
  async onRead(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const userId = (client as any).user?.sub;
    await this.chat.markRead(data.conversationId, userId);
    this.server.to(`conversation:${data.conversationId}`).emit('message:read', { conversationId: data.conversationId, by: userId });
    return { ok: true };
  }
}
```

- [ ] **Step 2: Wire ChatModule**

```typescript
@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WsJwtGuard],
})
export class ChatModule {}
```

Add to `AppModule.imports`.

- [ ] **Step 3: Manual WS smoke test**

In a separate scratch script `apps/api/scripts/ws-smoke.ts` (do not commit):

```typescript
import { io } from 'socket.io-client';

const token = process.argv[2];
const socket = io('http://localhost:3000/ws/chat', { auth: { token } });
socket.on('connect', () => console.log('connected'));
socket.on('message:new', (m) => console.log('new msg', m));
socket.emit('conversation:join', { conversationId: process.argv[3] });
socket.emit('message:send', { conversationId: process.argv[3], content: 'hello from script' });
```

Run with two tokens (candidate, recruiter) in two terminals → both see `message:new` events.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/src/chat apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "feat(chat): WebSocket gateway with conversation rooms and real-time messages"
git tag -a backend-1c-payment-chat-done -m "Backend 1C: payment, audit, chat complete"
```

---

## Done criteria for Plan 1C

- Recruiter can call `POST /payments/init` for a draft job, get a `paymentUrl` (mock or sandbox), and after webhook the job moves to `pending` (admin moderation).
- Candidate premium subscription activates after successful payment (CandidateProfile.isPremium = true, ai_credits_remaining = 100).
- Audit log rows appear for every admin publish/reject/pricing-change action.
- Two clients connected with valid JWTs can exchange messages in real time over `/ws/chat` once joined to the same `conversation:<id>` room.
- All unit + e2e tests pass.

Move to Plan 1D for CI/CD and deployment to Railway.
