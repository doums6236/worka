import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { z } from 'zod';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/audit.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { PricingService } from './pricing.service';

const upsertSchema = z.object({
  value: z.number().int().min(0),
  currency: z.string().length(3).default('GNF'),
});

@Controller('pricing')
@UseGuards(JwtGuard)
export class PricingController {
  constructor(private readonly svc: PricingService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.svc.get(key);
  }

  @Put(':key')
  @UseGuards(RolesGuard)
  @UseInterceptors(AuditInterceptor)
  @Roles('admin')
  @Audit('pricing.upsert', 'pricing_config')
  upsert(@Param('key') key: string, @CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.upsert(key, parsed.data.value, parsed.data.currency, u.sub);
  }
}
