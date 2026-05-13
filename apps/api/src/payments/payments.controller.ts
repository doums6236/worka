import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../common/prisma.service';
import { initPaymentSchema } from './dto/init-payment.dto';
import { verifyCinetPaySignature } from './webhook.signature';

interface CinetPayWebhookBody {
  transaction_id?: string;
  status?: string;
  payment_token?: string;
}

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
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-cinetpay-signature') signature: string,
    @Body() body: CinetPayWebhookBody,
  ) {
    const rawBody: string = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    if (!verifyCinetPaySignature(rawBody, signature ?? '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const transactionId = body.transaction_id;
    const status = body.status;
    const providerRef = body.payment_token ?? transactionId;

    if (!transactionId) return { ok: true, note: 'missing_transaction_id' };

    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) return { ok: true, note: 'unknown_transaction' };
    if (tx.status !== 'pending') return { ok: true, note: 'already_processed' };

    const newStatus =
      status === 'ACCEPTED' ? 'success' : status === 'REFUSED' ? 'failed' : tx.status;
    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { status: newStatus, providerRef },
    });

    if (newStatus === 'success') {
      await this.applySuccessSideEffects(updated);
    }
    return { ok: true };
  }

  private async applySuccessSideEffects(tx: {
    id: string;
    userId: string;
    type: string;
    metadata: unknown;
  }) {
    if (tx.type === 'recruiter_offer') {
      const md = tx.metadata as { jobId?: string } | null;
      if (md?.jobId) {
        await this.prisma.job.update({
          where: { id: md.jobId },
          data: { status: 'pending' },
        });
      }
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
