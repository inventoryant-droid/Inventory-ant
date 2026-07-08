import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || (user.role?.toLowerCase() !== 'admin' && user.role?.toLowerCase() !== 'super_admin')) {
      throw new ForbiddenException('Access denied: Administration rights required');
    }
    return true;
  }
}
