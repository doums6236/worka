import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { ApplicationsService } from './applications.service';
import { createApplicationSchema, updateApplicationStatusSchema } from './dto/application.dto';

@Controller()
export class ApplicationsController {
  constructor(private readonly svc: ApplicationsService) {}

  @Post('applications')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('candidate')
  create(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(u.sub, parsed.data.jobId, parsed.data.coverLetterUrl);
  }

  @Get('applications/mine')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('candidate')
  listMine(@CurrentUser() u: AccessPayload) {
    return this.svc.listMine(u.sub);
  }

  @Get('jobs/:jobId/applications')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  listForJob(@CurrentUser() u: AccessPayload, @Param('jobId') jobId: string) {
    return this.svc.listForJob(jobId, u.sub);
  }

  @Patch('applications/:id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  updateStatus(@CurrentUser() u: AccessPayload, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateApplicationStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.updateStatus(id, u.sub, parsed.data.status);
  }
}
