import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { computeMatchScore } from './match.util';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeedForCandidate(userId: string, limit = 10) {
    const [user, userDomains, alreadySwiped] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.userDomain.findMany({ where: { userId } }),
      this.prisma.swipe.findMany({ where: { candidateUserId: userId }, select: { jobId: true } }),
    ]);
    const domainIds = userDomains.map((d) => d.domainId);
    const swipedJobIds = alreadySwiped.map((s) => s.jobId);

    const candidateJobs = await this.prisma.job.findMany({
      where: {
        status: 'published',
        domainId: domainIds.length > 0 ? { in: domainIds } : undefined,
        country: user.countryCode ?? undefined,
        id: swipedJobIds.length > 0 ? { notIn: swipedJobIds } : undefined,
      },
      include: {
        company: true,
        domain: true,
        jobSkills: { include: { skill: true } },
      },
      take: limit * 3,
      orderBy: { publishedAt: 'desc' },
    });

    const scored = candidateJobs.map((job) => ({
      job,
      matchScore: computeMatchScore({
        candidateDomainIds: domainIds,
        candidateCountry: user.countryCode,
        candidateSkillIds: [],
        job: {
          domainId: job.domainId,
          country: job.country,
          skillIds: job.jobSkills.map((js) => js.skillId),
        },
      }),
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }
}
