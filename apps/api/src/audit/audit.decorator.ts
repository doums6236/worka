import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  targetType?: string;
}

export const Audit = (action: string, targetType?: string) =>
  SetMetadata(AUDIT_KEY, { action, targetType });
