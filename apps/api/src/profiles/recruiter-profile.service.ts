import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RecruiterSetupDto } from './dto/recruiter-setup.dto';

@Injectable()
export class RecruiterProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async setup(userId: string, data: RecruiterSetupDto) {
    const existing = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Recruiter profile already exists for this user');
    }
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: data.company });
      await tx.user.update({ where: { id: userId }, data: { role: 'recruiter' } });
      const profile = await tx.recruiterProfile.create({
        data: { userId, companyId: company.id, roleInCompany: data.roleInCompany },
      });
      return { company, profile };
    });
  }

  async getProfile(userId: string) {
    return this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { company: true },
    });
  }
}
