import {
  WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket,
  WebSocketServer, OnGatewayConnection,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatService } from './chat.service';
import { JwtService, AccessPayload } from '../auth/jwt.service';

interface AuthSocket extends Socket {
  user?: AccessPayload;
}

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: true, credentials: true },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
  ) {}

  handleConnection(client: AuthSocket) {
    const token =
      (client.handshake.auth as { token?: string } | undefined)?.token ??
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/, '')
        : undefined);
    if (!token) { client.disconnect(true); return; }
    try {
      client.user = this.jwt.verifyAccess(token);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async onJoin(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { conversationId: string }) {
    const userId = client.user?.sub;
    if (!userId) return { error: 'unauthorized' };
    await this.chat.ensureCanParticipate(data.conversationId, userId);
    await client.join(`conversation:${data.conversationId}`);
    return { joined: data.conversationId };
  }

  @SubscribeMessage('message:send')
  async onSend(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { conversationId: string; content: string }) {
    const userId = client.user?.sub;
    if (!userId) return { error: 'unauthorized' };
    const message = await this.chat.sendMessage(data.conversationId, userId, data.content);
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);
    return { sent: message.id };
  }

  @SubscribeMessage('message:read')
  async onRead(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { conversationId: string }) {
    const userId = client.user?.sub;
    if (!userId) return { error: 'unauthorized' };
    await this.chat.markRead(data.conversationId, userId);
    this.server.to(`conversation:${data.conversationId}`).emit('message:read', { conversationId: data.conversationId, by: userId });
    return { ok: true };
  }
}
