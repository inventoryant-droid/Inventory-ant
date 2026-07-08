import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { PlanHistory, AuditEvent, Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly repository: SubscriptionRepository) {}

  async logPlanChange(
    userId: string,
    oldPlan: string | null,
    newPlan: string,
    reason: string | null,
    changedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PlanHistory> {
    return this.repository.createPlanHistory(
      {
        userId,
        oldPlan,
        newPlan,
        reason,
        changedBy,
      },
      tx,
    );
  }

  async logAuditEvent(
    userId: string | null,
    action: string,
    details: string | null,
    performedBy: string,
    ipAddress?: string | null,
    tx?: Prisma.TransactionClient,
    requestId?: string | null,
    executionTime?: number | null,
    userAgent?: string | null,
    device?: string | null,
  ): Promise<AuditEvent> {
    return this.repository.createAuditEvent(
      {
        userId,
        action,
        details,
        performedBy,
        ipAddress,
        requestId,
        executionTime,
        userAgent,
        device,
      },
      tx,
    );
  }
}
