import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseApprovalRule, PurchaseApprovalInstance, PurchaseApprovalStep, PurchaseApprovalAction, Prisma } from '@prisma/client';

@Injectable()
export class PurchaseApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async seedRulesIfNone(userId: string): Promise<void> {
    const count = await this.prisma.purchaseApprovalRule.count({
      where: { userId },
    });
    if (count === 0) {
      await this.prisma.purchaseApprovalRule.createMany({
        data: [
          {
            userId,
            minAmount: 0,
            maxAmount: 50000,
            roleSequence: ['Manager'],
          },
          {
            userId,
            minAmount: 50000.01,
            maxAmount: 500000,
            roleSequence: ['Manager', 'Finance'],
          },
          {
            userId,
            minAmount: 500000.01,
            maxAmount: 999999999,
            roleSequence: ['Manager', 'Finance', 'CEO'],
          },
        ],
      });
    }
  }

  async findActiveRuleForAmount(amount: number, userId: string): Promise<PurchaseApprovalRule | null> {
    await this.seedRulesIfNone(userId);
    return this.prisma.purchaseApprovalRule.findFirst({
      where: {
        userId,
        minAmount: { lte: amount },
        maxAmount: { gte: amount },
      },
    });
  }

  async createInstance(
    userId: string,
    purchaseOrderId: string,
    ruleId: string,
    roles: string[],
  ): Promise<PurchaseApprovalInstance & { steps: PurchaseApprovalStep[] }> {
    return this.prisma.$transaction(async (tx) => {
      // Create approval instance
      const instance = await tx.purchaseApprovalInstance.create({
        data: {
          userId,
          purchaseOrderId,
          ruleId,
          status: 'PENDING',
          currentLevel: 0,
        },
      });

      // Create steps sequentially
      const steps = await Promise.all(
        roles.map((role, index) =>
          tx.purchaseApprovalStep.create({
            data: {
              instanceId: instance.id,
              level: index,
              role,
              status: 'PENDING',
            },
          }),
        ),
      );

      return { ...instance, steps };
    });
  }

  async findInstanceById(id: string, userId: string) {
    return this.prisma.purchaseApprovalInstance.findFirst({
      where: { id, userId },
      include: {
        steps: {
          orderBy: { level: 'asc' },
        },
        purchaseOrder: true,
        rule: true,
      },
    });
  }

  async findInstanceByPOId(purchaseOrderId: string, userId: string) {
    return this.prisma.purchaseApprovalInstance.findFirst({
      where: { purchaseOrderId, userId },
      include: {
        steps: {
          orderBy: { level: 'asc' },
        },
        purchaseOrder: true,
        rule: true,
      },
    });
  }

  async updateStepStatus(
    stepId: string,
    status: string,
    approvedBy: string,
    comment?: string,
  ): Promise<PurchaseApprovalStep> {
    return this.prisma.purchaseApprovalStep.update({
      where: { id: stepId },
      data: {
        status,
        approvedBy,
        actionDate: new Date(),
        comment: comment ?? null,
      },
    });
  }

  async updateInstance(instanceId: string, status: string, currentLevel: number): Promise<PurchaseApprovalInstance> {
    return this.prisma.purchaseApprovalInstance.update({
      where: { id: instanceId },
      data: { status, currentLevel },
    });
  }

  async createAction(data: {
    userId: string;
    purchaseOrderId: string;
    instanceId: string;
    performedBy: string;
    action: string;
    level: number;
    comment?: string;
    ipAddress?: string;
    deviceInfo?: string;
  }): Promise<PurchaseApprovalAction> {
    return this.prisma.purchaseApprovalAction.create({
      data: {
        userId: data.userId,
        purchaseOrderId: data.purchaseOrderId,
        instanceId: data.instanceId,
        performedBy: data.performedBy,
        action: data.action,
        level: data.level,
        comment: data.comment ?? null,
        ipAddress: data.ipAddress ?? null,
        deviceInfo: data.deviceInfo ?? null,
      },
    });
  }

  async listPendingApprovals(
    userId: string,
    userRole: string,
    skip: number,
    take: number,
  ): Promise<{ items: any[]; total: number }> {
    const allActive = await this.prisma.purchaseApprovalInstance.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            warehouse: true,
          },
        },
        steps: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matching = allActive.filter((ins) => {
      const currentStep = ins.steps.find((step) => step.level === ins.currentLevel);
      return (
        currentStep &&
        currentStep.role.toLowerCase() === userRole.toLowerCase() &&
        currentStep.status === 'PENDING'
      );
    });

    const total = matching.length;
    const items = matching.slice(skip, skip + take);

    return { items, total };
  }

  async getApprovalHistory(purchaseOrderId: string, userId: string): Promise<PurchaseApprovalAction[]> {
    return this.prisma.purchaseApprovalAction.findMany({
      where: { purchaseOrderId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updatePOStatus(poId: string, userId: string, status: any) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId, userId },
      data: { status },
    });
  }
}
