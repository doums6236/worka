import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CinetPayClient } from './cinetpay.client';
import { PricingService } from '../pricing/pricing.service';
import { InitPaymentDto } from './dto/init-payment.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cinetpay: CinetPayClient,
    private readonly pricing: PricingService,
  ) {}

  private priceKeyFor(type: TransactionType): string {
    return {
      recruiter_offer: 'recruiter.offer.price',
      recruiter_sub: 'recruiter.sub.monthly',
      candidate_premium: 'candidate.premium.monthly',
    }[type];
  }

  async initPayment(userId: string, dto: InitPaymentDto): Promise<{ transactionId: string; paymentUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const pricing = await this.pricing.get(this.priceKeyFor(dto.type));
    if (!pricing) {
      throw new BadRequestException(`Pricing for ${dto.type} not configured by admin`);
    }

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
