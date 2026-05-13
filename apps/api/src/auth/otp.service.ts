import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from '../common/redis.service';

@Injectable()
export class OtpService {
  constructor(private readonly redis: RedisService) {}

  private get length() { return Number(process.env.OTP_LENGTH ?? 6); }
  private get ttl() { return Number(process.env.OTP_TTL_SECONDS ?? 300); }
  private get maxAttempts() { return Number(process.env.OTP_MAX_ATTEMPTS ?? 3); }
  private get throttleWindow() { return Number(process.env.OTP_THROTTLE_WINDOW_SECONDS ?? 900); }
  private get throttleMax() { return Number(process.env.OTP_THROTTLE_MAX_PER_WINDOW ?? 3); }

  private keyCode(phone: string) { return `otp:${phone}`; }
  private keyAttempts(phone: string) { return `otp:attempts:${phone}`; }
  private keyThrottle(phone: string) { return `otp:throttle:${phone}`; }

  async generate(phone: string): Promise<string> {
    const count = await this.redis.incr(this.keyThrottle(phone));
    if (count === 1) {
      await this.redis.expire(this.keyThrottle(phone), this.throttleWindow);
    }
    if (count > this.throttleMax) {
      throw new HttpException('OTP request throttled — please wait', HttpStatus.TOO_MANY_REQUESTS);
    }

    const min = 10 ** (this.length - 1);
    const max = 10 ** this.length;
    const code = String(randomInt(min, max));

    await this.redis.setEx(this.keyCode(phone), this.ttl, code);
    await this.redis.del(this.keyAttempts(phone));
    return code;
  }

  async verify(phone: string, providedCode: string): Promise<boolean> {
    const stored = await this.redis.get(this.keyCode(phone));
    if (!stored) {
      throw new BadRequestException('OTP expired or not requested');
    }

    const attempts = await this.redis.incr(this.keyAttempts(phone));
    if (attempts === 1) {
      await this.redis.expire(this.keyAttempts(phone), this.ttl);
    }
    if (attempts > this.maxAttempts) {
      await this.redis.del(this.keyCode(phone));
      throw new HttpException('OTP locked — too many attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (stored !== providedCode) {
      return false;
    }

    await this.redis.del(this.keyCode(phone));
    await this.redis.del(this.keyAttempts(phone));
    return true;
  }
}
