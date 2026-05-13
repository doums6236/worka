import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from './jwt.service';

describe('AuthService.sendOtp', () => {
  const mockOtp = { generate: jest.fn(async () => '123456'), verify: jest.fn() } as unknown as OtpService;
  const mockSms = { sendOtp: jest.fn(async () => undefined) } as unknown as SmsService;
  const mockPrisma = {} as PrismaService;
  const mockJwt = {} as JwtService;
  const auth = new AuthService(mockOtp, mockSms, mockPrisma, mockJwt);

  beforeEach(() => jest.clearAllMocks());

  it('normalizes phone and sends OTP via SMS', async () => {
    await auth.sendOtp('+224 622 12 34 56');
    expect(mockOtp.generate).toHaveBeenCalledWith('+224622123456');
    expect(mockSms.sendOtp).toHaveBeenCalledWith('+224622123456', '123456');
  });

  it('rejects invalid phone', async () => {
    await expect(auth.sendOtp('garbage')).rejects.toThrow();
  });
});

describe('AuthService.verifyOtp', () => {
  const mockOtp = {
    generate: jest.fn(),
    verify: jest.fn(),
  } as unknown as OtpService;

  const mockSms = { sendOtp: jest.fn() } as unknown as SmsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const mockJwt = {
    signAccess: jest.fn(() => 'access.jwt.token'),
    signRefresh: jest.fn(() => 'refresh.jwt.token'),
  } as unknown as JwtService;

  const auth = new AuthService(mockOtp, mockSms, mockPrisma, mockJwt);

  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid OTP', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(false);
    await expect(auth.verifyOtp('+224622123456', '000000')).rejects.toThrow(/invalid/i);
  });

  it('creates a candidate user on first successful verify', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u-1', phone: '+224622123456', role: 'candidate', status: 'active',
    });
    const result = await auth.verifyOtp('+224622123456', '123456');
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.refreshToken).toBe('refresh.jwt.token');
    expect(result.user.role).toBe('candidate');
  });

  it('reuses existing user on subsequent verify', async () => {
    (mockOtp.verify as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-1', phone: '+224622123456', role: 'recruiter', status: 'active',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: 'u-1', phone: '+224622123456', role: 'recruiter', status: 'active',
    });
    const result = await auth.verifyOtp('+224622123456', '123456');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(result.user.role).toBe('recruiter');
  });
});
