import { Body, Controller, Get, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessPayload } from '../auth/jwt.service';
import { ChatService } from './chat.service';

const createConvSchema = z.object({
  candidateUserId: z.string().uuid(),
  jobId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const appointmentSchema = z.object({
  datetime: z.string().datetime(),
  location: z.string().max(200).optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  note: z.string().max(500).optional(),
});

const appointmentResponseSchema = z.object({
  response: z.enum(['confirm', 'decline']),
  declineReason: z.string().max(300).optional(),
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
    if (u.role !== 'recruiter') {
      throw new BadRequestException('Only recruiters can initiate a conversation');
    }
    return this.svc.createConversationAsRecruiter(
      u.sub,
      parsed.data.candidateUserId,
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

  @Post('conversations/:id/close')
  close(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.closeConversation(id, u.sub);
  }

  @Post('conversations/:id/reopen')
  reopen(@CurrentUser() u: AccessPayload, @Param('id') id: string) {
    return this.svc.reopenConversation(id, u.sub);
  }

  @Post('conversations/:id/appointment')
  proposeAppointment(
    @CurrentUser() u: AccessPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.proposeAppointment(id, u.sub, parsed.data);
  }

  @Post('messages/:id/appointment-response')
  respondAppointment(
    @CurrentUser() u: AccessPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = appointmentResponseSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.respondAppointment(id, u.sub, parsed.data.response, parsed.data.declineReason);
  }
}
