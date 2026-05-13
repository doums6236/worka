import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { RecruiterProfileService } from './recruiter-profile.service';
import { recruiterSetupSchema } from './dto/recruiter-setup.dto';

@Controller('me/recruiter-profile')
@UseGuards(JwtGuard)
export class RecruiterProfileController {
  constructor(private readonly svc: RecruiterProfileService) {}

  @Get()
  get(@CurrentUser() u: AccessPayload) {
    return this.svc.getProfile(u.sub);
  }

  @Post('setup')
  setup(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = recruiterSetupSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.setup(u.sub, parsed.data);
  }
}
