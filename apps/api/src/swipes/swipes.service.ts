import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SwipeDirection } from '@prisma/client';

@Injectable()
export class SwipesService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, jobId: string, direction: SwipeDirection, matchScore?: number) {
    return this.prisma.swipe.upsert({
      where: { candidateUserId_jobId: { candidateUserId: userId, jobId } },
      create: { candidateUserId: userId, jobId, direction, matchScoreAtSwipe: matchScore },
      update: { direction, matchScoreAtSwipe: matchScore },
    });
  }

  listSaved(userId: string) {
    return this.prisma.swipe.findMany({
      where: { candidateUserId: userId, direction: 'saved' },
      include: { job: { include: { company: true, domain: true } } },
      orderBy: { swipedAt: 'desc' },
    });
  }
}
