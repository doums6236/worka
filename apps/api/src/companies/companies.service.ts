import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }

  verify(id: string, adminId: string) {
    return this.prisma.company.update({
      where: { id },
      data: { verifiedByAdminId: adminId },
    });
  }
}
