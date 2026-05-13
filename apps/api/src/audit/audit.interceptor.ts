import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const actorId = req.user?.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap((result) => {
        const targetId =
          typeof result === 'object' && result !== null && 'id' in result
            ? (result as { id: string }).id
            : undefined;
        void this.audit.log({
          actorId,
          action: meta.action,
          targetType: meta.targetType,
          targetId,
          payload: { body: req.body, params: req.params },
          ip,
          userAgent,
        });
      }),
    );
  }
}
