import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request['user'];
    
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Role info missing or invalid');
    }
    
    // Normalize role comparison (supporting e.g. "admin", "user", "ROLE_ADMIN", "ROLE_USER")
    const userRole = user.role.toUpperCase();
    const matched = requiredRoles.some(role => {
      const targetRole = role.toUpperCase();
      // Support matching "admin" with "ROLE_ADMIN" and "user" with "ROLE_USER"
      return userRole === targetRole || 
             userRole.replace(/^ROLE_/, '') === targetRole.replace(/^ROLE_/, '');
    });
    
    if (!matched) {
      throw new ForbiddenException(`Access denied: Insufficient role permissions. Required: ${requiredRoles.join(', ')}`);
    }
    
    return true;
  }
}
