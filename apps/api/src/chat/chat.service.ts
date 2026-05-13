import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(candidateUserId: string, recruiterUserId: string, jobId: string) {
    const application = await this.prisma.application.findUnique({
      where: { jobId_candidateUserId: { jobId, candidateUserId } },
    });
    if (!application) {
      throw new ForbiddenException('No application linking this candidate to this job');
    }
    return this.prisma.conversation.upsert({
      where: {
        candidateUserId_recruiterUserId_jobId: { candidateUserId, recruiterUserId, jobId },
      },
      create: { candidateUserId, recruiterUserId, jobId },
      update: {},
    });
  }

  async ensureCanParticipate(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.candidateUserId !== userId && conv.recruiterUserId !== userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  async listMessages(conversationId: string, userId: string) {
    await this.ensureCanParticipate(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      take: 200,
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    if (!content || content.trim().length === 0 || content.length > 4000) {
      throw new BadRequestException('Message content must be 1..4000 chars');
    }
    await this.ensureCanParticipate(conversationId, senderId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.sentAt },
    });
    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.ensureCanParticipate(conversationId, userId);
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  listMyConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { OR: [{ candidateUserId: userId }, { recruiterUserId: userId }] },
      include: {
        job: { include: { company: true } },
        candidate: { include: { candidateProfile: true } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }
}
