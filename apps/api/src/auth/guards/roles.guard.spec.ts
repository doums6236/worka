import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function mockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  it('allows when no roles required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'candidate' }))).toBe(true);
  });

  it('allows when user role matches', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin', 'recruiter']);
    expect(guard.canActivate(mockContext({ role: 'admin' }))).toBe(true);
  });

  it('rejects when user role mismatches', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    expect(() => guard.canActivate(mockContext({ role: 'candidate' }))).toThrow();
  });
});
