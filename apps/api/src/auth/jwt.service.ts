import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AccessPayload {
  sub: string;
  role: 'candidate' | 'recruiter' | 'admin';
}

export interface RefreshPayload {
  sub: string;
}

@Injectable()
export class JwtService {
  private get accessSecret() { return process.env.JWT_ACCESS_SECRET!; }
  private get refreshSecret() { return process.env.JWT_REFRESH_SECRET!; }
  private get accessTtl() { return process.env.JWT_ACCESS_TTL ?? '15m'; }
  private get refreshTtl() { return process.env.JWT_REFRESH_TTL ?? '30d'; }

  signAccess(payload: AccessPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessTtl as jwt.SignOptions['expiresIn'] });
  }

  signRefresh(payload: RefreshPayload): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshTtl as jwt.SignOptions['expiresIn'] });
  }

  verifyAccess(token: string): AccessPayload {
    return jwt.verify(token, this.accessSecret) as AccessPayload;
  }

  verifyRefresh(token: string): RefreshPayload {
    return jwt.verify(token, this.refreshSecret) as RefreshPayload;
  }
}
