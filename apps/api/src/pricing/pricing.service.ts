import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.pricingConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    return this.prisma.pricingConfig.findUnique({ where: { key } });
  }

  async getOrThrow(key: string) {
    const p = await this.get(key);
    if (!p) throw new NotFoundException(`Pricing key ${key} not configured`);
    return p;
  }

  upsert(key: string, value: number, currency: string, adminId: string) {
    return this.prisma.pricingConfig.upsert({
      where: { key },
      create: { key, value, currency, updatedByAdminId: adminId },
      update: { value, currency, updatedByAdminId: adminId },
    });
  }
}
