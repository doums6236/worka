import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { MessageType, ConversationStatus } from '@prisma/client';

export interface AppointmentMetadata {
  datetime: string; // ISO 8601
  location?: string;
  durationMin?: number;
  note?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createConversationAsRecruiter(
    recruiterUserId: string,
    candidateUserId: string,
    jobId: string,
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.postedByUserId !== recruiterUserId) {
      throw new ForbiddenException('Only the recruiter who posted the job can initiate the conversation');
    }
    const application = await this.prisma.application.findUnique({
      where: { jobId_candidateUserId: { jobId, candidateUserId } },
    });
    if (!application) {
      throw new ForbiddenException('Candidate has not applied to this job');
    }
    const conv = await this.prisma.conversation.upsert({
      where: {
        candidateUserId_recruiterUserId_jobId: { candidateUserId, recruiterUserId, jobId },
      },
      create: { candidateUserId, recruiterUserId, jobId },
      update: { status: 'active', closedAt: null, closedByUserId: null },
      include: { job: { include: { company: true } } },
    });

    await this.notifications.create({
      userId: candidateUserId,
      type: 'new_message',
      title: `${conv.job.company.name} t'a contacté`,
      body: `À propos de l'offre "${conv.job.title}"`,
      data: { conversationId: conv.id },
    });
    return conv;
  }

  async ensureCanParticipate(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.candidateUserId !== userId && conv.recruiterUserId !== userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  listMessages(conversationId: string, userId: string) {
    return this.ensureCanParticipate(conversationId, userId).then(() =>
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { sentAt: 'asc' },
        take: 200,
      }),
    );
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text',
    metadata?: Record<string, unknown>,
  ) {
    if (type === 'text' && (!content || content.trim().length === 0 || content.length > 4000)) {
      throw new BadRequestException('Message content must be 1..4000 chars');
    }
    const conv = await this.ensureCanParticipate(conversationId, senderId);

    // Candidates cannot write when conversation is closed
    if (conv.status === 'closed' && senderId === conv.candidateUserId) {
      throw new ForbiddenException('Conversation is closed; only the recruiter can re-open it.');
    }

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content, type, metadata: metadata as never },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.sentAt },
    });

    // Notify the OTHER party
    const recipientId = senderId === conv.candidateUserId ? conv.recruiterUserId : conv.candidateUserId;
    if (type === 'text') {
      await this.notifications.create({
        userId: recipientId,
        type: 'new_message',
        title: 'Nouveau message',
        body: content.slice(0, 80),
        data: { conversationId },
      });
    }
    return message;
  }

  async closeConversation(conversationId: string, recruiterId: string) {
    const conv = await this.ensureCanParticipate(conversationId, recruiterId);
    if (conv.recruiterUserId !== recruiterId) {
      throw new ForbiddenException('Only the recruiter can close the conversation');
    }
    if (conv.status === 'closed') return conv;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'closed', closedAt: new Date(), closedByUserId: recruiterId },
    });
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: recruiterId,
        content: 'Le recruteur a clôturé la discussion.',
        type: 'system',
      },
    });
    await this.notifications.create({
      userId: conv.candidateUserId,
      type: 'conversation_closed',
      title: 'Discussion clôturée',
      body: 'Le recruteur a clôturé votre discussion.',
      data: { conversationId },
    });
    return updated;
  }

  async reopenConversation(conversationId: string, recruiterId: string) {
    const conv = await this.ensureCanParticipate(conversationId, recruiterId);
    if (conv.recruiterUserId !== recruiterId) {
      throw new ForbiddenException('Only the recruiter can reopen the conversation');
    }
    if (conv.status === 'active') return conv;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'active', closedAt: null, closedByUserId: null },
    });
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: recruiterId,
        content: 'Le recruteur a rouvert la discussion.',
        type: 'system',
      },
    });
    await this.notifications.create({
      userId: conv.candidateUserId,
      type: 'conversation_reopened',
      title: 'Discussion rouverte',
      body: 'Le recruteur a rouvert la discussion. Tu peux répondre.',
      data: { conversationId },
    });
    return updated;
  }

  async proposeAppointment(
    conversationId: string,
    recruiterId: string,
    appointment: AppointmentMetadata,
  ) {
    const conv = await this.ensureCanParticipate(conversationId, recruiterId);
    if (conv.recruiterUserId !== recruiterId) {
      throw new ForbiddenException('Only the recruiter can propose appointments');
    }
    if (conv.status === 'closed') {
      throw new ForbiddenException('Cannot propose an appointment in a closed conversation');
    }
    if (!appointment.datetime || isNaN(Date.parse(appointment.datetime))) {
      throw new BadRequestException('Valid datetime required');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: recruiterId,
        content: `Rendez-vous proposé pour ${new Date(appointment.datetime).toLocaleString('fr-FR')}`,
        type: 'appointment_proposal',
        metadata: { ...appointment, status: 'pending' } as never,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.sentAt },
    });
    await this.notifications.create({
      userId: conv.candidateUserId,
      type: 'appointment_proposed',
      title: 'Nouveau rendez-vous proposé',
      body: `Le ${new Date(appointment.datetime).toLocaleString('fr-FR')}`,
      data: { conversationId, messageId: message.id, datetime: appointment.datetime },
    });
    return message;
  }

  async respondAppointment(
    messageId: string,
    candidateId: string,
    response: 'confirm' | 'decline',
    declineReason?: string,
  ) {
    const proposal = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!proposal || proposal.type !== 'appointment_proposal') {
      throw new NotFoundException('Appointment proposal not found');
    }
    if (proposal.conversation.candidateUserId !== candidateId) {
      throw new ForbiddenException();
    }

    const responseType = response === 'confirm' ? 'appointment_confirmed' : 'appointment_declined';
    const originalMeta = (proposal.metadata ?? {}) as unknown as AppointmentMetadata & { status?: string };
    const updatedMeta = {
      ...originalMeta,
      status: response === 'confirm' ? 'confirmed' : 'declined',
      respondedAt: new Date().toISOString(),
      ...(declineReason ? { declineReason } : {}),
    };

    // Update the original proposal's status
    await this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: updatedMeta as never },
    });

    // Add a response message
    const responseMessage = await this.prisma.message.create({
      data: {
        conversationId: proposal.conversationId,
        senderId: candidateId,
        content:
          response === 'confirm'
            ? `Rendez-vous confirmé pour ${new Date(originalMeta.datetime).toLocaleString('fr-FR')}`
            : `Rendez-vous décliné${declineReason ? ` — ${declineReason}` : ''}`,
        type: responseType,
        metadata: updatedMeta as never,
      },
    });
    await this.prisma.conversation.update({
      where: { id: proposal.conversationId },
      data: { lastMessageAt: responseMessage.sentAt },
    });

    await this.notifications.create({
      userId: proposal.conversation.recruiterUserId,
      type: response === 'confirm' ? 'appointment_confirmed' : 'appointment_declined',
      title: response === 'confirm' ? 'Rendez-vous confirmé' : 'Rendez-vous décliné',
      body:
        response === 'confirm'
          ? `Le candidat a confirmé pour ${new Date(originalMeta.datetime).toLocaleString('fr-FR')}`
          : `Le candidat a décliné${declineReason ? ` (${declineReason})` : ''}`,
      data: { conversationId: proposal.conversationId, messageId: proposal.id },
    });

    return { proposal: { id: messageId, metadata: updatedMeta }, response: responseMessage };
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
