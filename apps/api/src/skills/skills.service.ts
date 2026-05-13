import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSkillDto) {
    try {
      return await this.prisma.skill.create({ data });
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException('Skill name already exists');
      }
      throw e;
    }
  }

  list(domainId?: string) {
    return this.prisma.skill.findMany({
      where: domainId ? { domainId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.skill.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Skill not found');
    return s;
  }

  async update(id: string, data: UpdateSkillDto) {
    await this.findOne(id);
    return this.prisma.skill.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.skill.delete({ where: { id } });
  }
}
