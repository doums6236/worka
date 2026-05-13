import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDomainDto, UpdateDomainDto } from './dto/domain.dto';

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
