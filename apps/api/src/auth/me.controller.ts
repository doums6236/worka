import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AccessPayload } from './jwt.service';
import { PrismaService } from '../common/prisma.service';

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getMe(@CurrentUser() user: AccessPayload) {
    return this.prisma.user.findUnique({ where: { id: user.sub } });
  }
}
