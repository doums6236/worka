import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessPayload } from '../jwt.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
