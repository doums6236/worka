import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';
    service = new JwtService();
  });

  it('issues an access token and verifies it', () => {
    const token = service.signAccess({ sub: 'user-1', role: 'candidate' });
    const payload = service.verifyAccess(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('candidate');
  });

  it('issues a refresh token and verifies it', () => {
    const token = service.signRefresh({ sub: 'user-1' });
    const payload = service.verifyRefresh(token);
    expect(payload.sub).toBe('user-1');
  });

  it('rejects access token signed with refresh secret', () => {
    const token = service.signRefresh({ sub: 'user-1' });
    expect(() => service.verifyAccess(token)).toThrow();
  });

  it('rejects tampered token', () => {
    const token = service.signAccess({ sub: 'user-1', role: 'candidate' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => service.verifyAccess(tampered)).toThrow();
  });
});
