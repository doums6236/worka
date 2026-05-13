import { Body, Controller, Get, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { ChatService } from './chat.service';

const createConvSchema = z.object({
  candidateUserId: z.string().uuid(),
  recruiterUserId: z.string().uuid(),
  jobId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

@Controller('chat')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('conversations')
  list(@CurrentUser() u: AccessPayload) {
    return this.svc.listMyConversations(u.sub);
  }

  @Post('conversations')
  create(@CurrentUser() u: AccessPayload, @Body() body: unknown) {
    const parsed = createConvSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    if (u.sub !== parsed.data.candidateUserId && u.sub !== parsed.data.recruiterUserId) {
      throw new BadRequestException('Caller must be one of the two parties');
    }
    return this.svc.getOrCreateConversation(
      parsed.data.candidateUserId,
      parsed.data.recruiterUserId,
      parsed.data.jobId,
    );
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.listMessages(id, u.sub);
  }

  @Post('conversations/:id/messages')
  send(@CurrentUser() u: AccessPayload, @Param('id') id: string, @Body() body: unknown) {
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.sendMessage(id, u.sub, parsed.data.content);
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.markRead(id, u.sub);
  }
}
