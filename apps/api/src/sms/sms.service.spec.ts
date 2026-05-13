import { SmsService } from './sms.service';

describe('SmsService (mock provider)', () => {
  let sms: SmsService;
  const originalLog = console.log;
  let logs: string[];

  beforeEach(() => {
    process.env.SMS_PROVIDER = 'mock';
    sms = new SmsService();
    logs = [];
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('logs OTP to console with mock provider', async () => {
    await sms.sendOtp('+224622123456', '123456');
    const joined = logs.join('\n');
    expect(joined).toContain('+224622123456');
    expect(joined).toContain('123456');
  });

  it('throws if SMS_PROVIDER is cinetpay without keys', async () => {
    process.env.SMS_PROVIDER = 'cinetpay';
    delete process.env.CINETPAY_API_KEY;
    delete process.env.CINETPAY_SITE_ID;
    const realSms = new SmsService();
    await expect(realSms.sendOtp('+224622123456', '123456')).rejects.toThrow();
  });
});
