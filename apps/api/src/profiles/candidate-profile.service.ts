import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpsertCandidateProfileDto } from './dto/candidate-profile.dto';

@Injectable()
export class CandidateProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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
    await this.getOrCreate(userId);
    return this.prisma.candidateProfile.update({
      where: { userId },
      data: { cvUrl: publicUrl },
    });
  }
}
