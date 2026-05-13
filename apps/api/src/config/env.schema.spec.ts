import { envSchema } from './env.schema';

describe('envSchema', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://x:y@localhost:5433/z',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_REFRESH_SECRET: 'b'.repeat(64),
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    OTP_LENGTH: '6',
    OTP_TTL_SECONDS: '300',
    OTP_MAX_ATTEMPTS: '3',
    OTP_THROTTLE_WINDOW_SECONDS: '900',
    OTP_THROTTLE_MAX_PER_WINDOW: '3',
    SMS_PROVIDER: 'mock',
  };

  it('parses valid env', () => {
    const parsed = envSchema.parse(validEnv);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.OTP_LENGTH).toBe(6);
  });

  it('rejects missing DATABASE_URL', () => {
    const bad: Record<string, string> = { ...validEnv };
    delete bad.DATABASE_URL;
    expect(() => envSchema.parse(bad)).toThrow();
  });

  it('rejects short JWT secrets', () => {
    const bad = { ...validEnv, JWT_ACCESS_SECRET: 'short' };
    expect(() => envSchema.parse(bad)).toThrow();
  });
});
