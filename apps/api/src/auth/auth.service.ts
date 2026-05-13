import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { OtpService } from './otp.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from './jwt.service';
import { normalizePhone } from './phone.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly sms: SmsService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(rawPhone: string): Promise<{ phone: string }> {
    const { e164 } = normalizePhone(rawPhone);
    const code = await this.otp.generate(e164);
    await this.sms.sendOtp(e164, code);
    return { phone: e164 };
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; role: string; status: string };
  }> {
    const { e164, countryCode } = normalizePhone(rawPhone);
    const ok = await this.otp.verify(e164, code);
    if (!ok) {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user: User | null = await this.prisma.user.findUnique({ where: { phone: e164 } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: e164,
          role: 'candidate',
          status: 'active',
          countryCode,
          lastSeenAt: new Date(),
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const accessToken = this.jwt.signAccess({ sub: user.id, role: user.role });
    const refreshToken = this.jwt.signRefresh({ sub: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, role: user.role, status: user.status },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = this.jwt.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not active');
    }
    return {
      accessToken: this.jwt.signAccess({ sub: user.id, role: user.role }),
      refreshToken: this.jwt.signRefresh({ sub: user.id }),
    };
  }
}
