import { OtpService } from './otp.service';
import { RedisService } from '../common/redis.service';

describe('OtpService', () => {
  let otp: OtpService;
  let redis: RedisService;
  const phone = '+224622123456';

  beforeAll(async () => {
    process.env.OTP_LENGTH = '6';
    process.env.OTP_TTL_SECONDS = '60';
    process.env.OTP_MAX_ATTEMPTS = '3';
    process.env.OTP_THROTTLE_WINDOW_SECONDS = '900';
    process.env.OTP_THROTTLE_MAX_PER_WINDOW = '3';
    redis = new RedisService();
    await redis.onModuleInit();
    otp = new OtpService(redis);
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  beforeEach(async () => {
    await redis.del(`otp:${phone}`);
    await redis.del(`otp:attempts:${phone}`);
    await redis.del(`otp:throttle:${phone}`);
  });

  it('generates a code of configured length', async () => {
    const code = await otp.generate(phone);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies a correct code', async () => {
    const code = await otp.generate(phone);
    const result = await otp.verify(phone, code);
    expect(result).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    await otp.generate(phone);
    const result = await otp.verify(phone, '000000');
    expect(result).toBe(false);
  });

  it('locks after 3 failed attempts', async () => {
    await otp.generate(phone);
    await otp.verify(phone, '000000');
    await otp.verify(phone, '000000');
    await otp.verify(phone, '000000');
    await expect(otp.verify(phone, '000000')).rejects.toThrow(/locked|expired/i);
  });

  it('throttles after 3 generate calls in window', async () => {
    await otp.generate(phone);
    await otp.generate(phone);
    await otp.generate(phone);
    await expect(otp.generate(phone)).rejects.toThrow(/throttled/i);
  });
});
