import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { FeedService } from './feed.service';

@Controller('jobs/feed')
@UseGuards(JwtGuard, RolesGuard)
@Roles('candidate')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  get(@CurrentUser() u: AccessPayload, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.feed.getFeedForCandidate(
      u.sub,
      Math.min(50, Number.isFinite(parsed) ? parsed : 10),
    );
  }
}
