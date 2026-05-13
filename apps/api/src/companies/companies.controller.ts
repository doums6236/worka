import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { CompaniesService } from './companies.service';

@Controller('companies')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Patch(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() u: AccessPayload) {
    return this.svc.verify(id, u.sub);
  }
}
