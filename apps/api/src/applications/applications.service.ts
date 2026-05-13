import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(candidateUserId: string, jobId: string, coverLetterUrl?: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) throw new NotFoundException('Job not found');
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
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.postedByUserId !== recruiterUserId) throw new ForbiddenException();
    return this.prisma.application.findMany({
      where: { jobId },
      include: { candidate: { include: { candidateProfile: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateStatus(applicationId: string, recruiterUserId: string, status: ApplicationStatus) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.job.postedByUserId !== recruiterUserId) throw new ForbiddenException();
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        recruiterViewedAt: status !== 'pending' ? new Date() : app.recruiterViewedAt,
      },
    });
  }
}
