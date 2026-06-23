import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorStatus } from '../constants/error-status';
import { ErrorExceptionFactory } from '../middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class RolesGuard implements CanActivate {
  IS_PUBLIC_KEY: string = process.env.IS_PUBLIC_KEY;
  ROLES_KEY: string = process.env.ROLES_KEY;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(this.ROLES_KEY, context.getHandler());

    const request = context.switchToHttp().getRequest();
    const url = request.url;

    const isPublic = this.reflector.getAllAndOverride<boolean>(this.IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || !roles) {
      return true;
    }

    const user = request.user;

    if (!user) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    if (!user?.role) {
      user.role = url.includes('customer') ? 'customer' : 'consultant';
    }

    return this.matchRoles(roles, user.role);
  }

  matchRoles(roles: string[], userRole: string): boolean {
    return roles.includes(userRole);
  }
}
