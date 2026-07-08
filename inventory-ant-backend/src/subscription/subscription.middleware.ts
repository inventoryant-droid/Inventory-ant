import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async use(req: any, res: any, next: () => void) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = this.jwtService.decode(token) as any;
        if (payload) {
          const userId = payload.sub;
          const role = payload.role;
          const email = payload.email;
          const tenantEmail = payload.tenantEmail || email;

          // Sync the owner's plan if the current request is from a staff member
          if (role === 'staff' && tenantEmail) {
            await this.subscriptionService.syncUserPlanAndValidityByEmail(tenantEmail);
          } else if (userId) {
            await this.subscriptionService.syncUserPlanAndValidity(userId);
          }

          if (userId) {
            const plan = await this.subscriptionService.getCurrentPlan(userId);
            req.subscription = {
              planId: plan.id,
              planSlug: plan.slug,
              userId,
              email: tenantEmail,
            };
          }
        }
      } catch (err) {
        console.error('SubscriptionMiddleware JWT parsing error:', err.message);
      }
    }
    next();
  }
}
