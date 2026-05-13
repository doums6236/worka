import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateJobDto) {
    const rp = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!rp) throw new ForbiddenException('Recruiter profile required to post a job');
    if (rp.companyId !== data.companyId) throw new ForbiddenException('Not your company');

    const { skillIds, deadline, ...rest } = data;
    return this.prisma.job.create({
      data: {
        ...rest,
        postedByUserId: userId,
        deadline: deadline ? new Date(deadline) : undefined,
        jobSkills: { create: skillIds.map((id) => ({ skillId: id })) },
      },
      include: { jobSkills: { include: { skill: true } } },
    });
  }

  async update(userId: string, jobId: string, data: UpdateJobDto) {
    const job = await this.findOneOrThrow(jobId);
    if (job.postedByUserId !== userId) throw new ForbiddenException();
    if (job.status !== 'draft') throw new BadRequestException('Only draft jobs can be edited');

    const { skillIds, deadline, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (skillIds) {
        await tx.jobSkill.deleteMany({ where: { jobId } });
        await tx.jobSkill.createMany({ data: skillIds.map((sid) => ({ jobId, skillId: sid })) });
      }
      return tx.job.update({
        where: { id: jobId },
        data: {
          ...rest,
          deadline: deadline ? new Date(deadline) : undefined,
        },
        include: { jobSkills: { include: { skill: true } } },
      });
    });
  }

  async submit(userId: string, jobId: string) {
    const job = await this.findOneOrThrow(jobId);
    if (job.postedByUserId !== userId) throw new ForbiddenException();
    if (job.status !== 'draft') throw new BadRequestException('Only draft jobs can be submitted');
    return this.prisma.job.update({ where: { id: jobId }, data: { status: 'pending' } });
  }

  publish(jobId: string) {
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  reject(jobId: string) {
    return this.prisma.job.update({ where: { id: jobId }, data: { status: 'closed' } });
  }

  async remove(userId: string, isAdmin: boolean, jobId: string) {
    const job = await this.findOneOrThrow(jobId);
    if (!isAdmin && (job.postedByUserId !== userId || job.status !== 'draft')) {
      throw new ForbiddenException();
    }
    await this.prisma.job.delete({ where: { id: jobId } });
  }

  findOne(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: { company: true, domain: true, jobSkills: { include: { skill: true } } },
    });
  }

  private async findOneOrThrow(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  list(filter: { status?: JobStatus; country?: string; domainId?: string }) {
    return this.prisma.job.findMany({
      where: {
        status: filter.status,
        country: filter.country,
        domainId: filter.domainId,
      },
      orderBy: { publishedAt: 'desc' },
      include: { company: true, domain: true },
      take: 50,
    });
  }

  listMine(userId: string) {
    return this.prisma.job.findMany({
      where: { postedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { company: true, domain: true, _count: { select: { applications: true } } },
    });
  }
}
