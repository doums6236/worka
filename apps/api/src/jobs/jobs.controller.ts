import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UseGuards, BadRequestException, NotFoundException, UseInterceptors,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { JobsService } from './jobs.service';
import { createJobSchema, updateJobSchema } from './dto/job.dto';
import { JobStatus } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/audit.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly svc: JobsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('country') country?: string,
    @Query('domainId') domainId?: string,
  ) {
    return this.svc.list({ status: status as JobStatus | undefined, country, domainId });
  }

  @Get('mine')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  listMine(@CurrentUser() u: AccessPayload) {
    return this.svc.listMine(u.sub);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const job = await this.svc.findOne(id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  create(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(u.sub, parsed.data);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  update(@CurrentUser() u: AccessPayload, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.update(u.sub, id, parsed.data);
  }

  @Post(':id/submit')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('recruiter')
  submit(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.submit(u.sub, id);
  }

  @Post(':id/publish')
  @UseGuards(JwtGuard, RolesGuard)
  @UseInterceptors(AuditInterceptor)
  @Roles('admin')
  @Audit('job.publish', 'job')
  publish(@Param('id') id: string) {
    return this.svc.publish(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtGuard, RolesGuard)
  @UseInterceptors(AuditInterceptor)
  @Roles('admin')
  @Audit('job.reject', 'job')
  reject(@Param('id') id: string) {
    return this.svc.reject(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  remove(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.remove(u.sub, u.role === 'admin', id);
  }
}
