import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService, AccessPayload } from '../auth/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const headerAuth =
      typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/, '')
        : undefined;
    const token: string | undefined =
      (client.handshake.auth as { token?: string } | undefined)?.token ?? headerAuth;
    if (!token) throw new WsException('Missing token');
    try {
      const payload: AccessPayload = this.jwt.verifyAccess(token);
      (client as Socket & { user?: AccessPayload }).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
