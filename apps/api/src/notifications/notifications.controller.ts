import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from './notifications.service';

const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(500).nullable(),
});

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(
    private readonly svc: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() u: AccessPayload) {
    return this.svc.list(u.sub);
  }

  @Get('unread-count')
  async unread(@CurrentUser() u: AccessPayload) {
    return { count: await this.svc.countUnread(u.sub) };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() u: AccessPayload) {
    const r = await this.svc.markAllRead(u.sub);
    return { count: r.count };
  }

  @Patch(':id/read')
  async readOne(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    const r = await this.svc.markOneRead(u.sub, id);
    return { count: r.count };
  }

  @Post('push-token')
  async setPushToken(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = pushTokenSchema.parse(body);
    await this.prisma.user.update({
      where: { id: u.sub },
      data: { pushToken: parsed.pushToken },
    });
    return { ok: true };
  }
}
