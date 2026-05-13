import { Body, Controller, Get, Patch, Post, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { CandidateProfileService } from './candidate-profile.service';
import {
  upsertCandidateProfileSchema, setDomainsSchema, setCvUrlSchema,
} from './dto/candidate-profile.dto';

@Controller('me/candidate-profile')
@UseGuards(JwtGuard, RolesGuard)
@Roles('candidate')
export class CandidateProfileController {
  constructor(private readonly svc: CandidateProfileService) {}

  @Get()
  get(@CurrentUser() u: AccessPayload) {
    return this.svc.getOrCreate(u.sub);
  }

  @Patch()
  update(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = upsertCandidateProfileSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.update(u.sub, parsed.data);
  }

  @Get('domains')
  getDomains(@CurrentUser() u: AccessPayload) {
    return this.svc.getDomains(u.sub);
  }

  @Put('domains')
  setDomains(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = setDomainsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.setDomains(u.sub, parsed.data.domainIds);
  }

  @Post('cv-upload-url')
  cvUploadUrl(@CurrentUser() u: AccessPayload) {
    return this.svc.getCvUploadUrl(u.sub);
  }

  @Patch('cv')
  setCv(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = setCvUrlSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.setCvUrl(u.sub, parsed.data.cvUrl);
  }
}
