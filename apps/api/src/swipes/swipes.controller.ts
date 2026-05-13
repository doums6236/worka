import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { SwipesService } from './swipes.service';
import { recordSwipeSchema } from './dto/swipe.dto';

@Controller('swipes')
@UseGuards(JwtGuard, RolesGuard)
@Roles('candidate')
export class SwipesController {
  constructor(private readonly svc: SwipesService) {}

  @Post()
  record(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = recordSwipeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.record(u.sub, parsed.data.jobId, parsed.data.direction, parsed.data.matchScore);
  }

  @Get('saved')
  saved(@CurrentUser() u: AccessPayload) {
    return this.svc.listSaved(u.sub);
  }
}
