import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PurchaseApprovalRepository } from './purchase-approval.repository';
import { PurchaseOrderRepository } from '../purchase-order/purchase-order.repository';
import { PurchaseApprovalEventEmitter } from './domain/events/approval-event-emitter';
import {
  ApprovalWorkflowStartedEvent,
  ApprovalAssignedEvent,
  ApprovalApprovedEvent,
  ApprovalRejectedEvent,
  PurchaseOrderApprovedEvent,
  PurchaseOrderRejectedEvent,
  PurchaseOrderReadyToSendEvent,
} from './domain/events/approval.events';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchaseApprovalService {
  constructor(
    private readonly repository: PurchaseApprovalRepository,
    private readonly poRepository: PurchaseOrderRepository,
    private readonly eventEmitter: PurchaseApprovalEventEmitter,
  ) {}

  async startWorkflow(purchaseOrderId: string, userId: string) {
    // 1. Verify PO exists, belongs to tenant, and status is PENDING_APPROVAL
    const po = await this.poRepository.findByIdWithDetails(purchaseOrderId, userId);
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${purchaseOrderId} not found`);
    }

    if (po.status !== PurchaseStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot start approval workflow. PO must be in PENDING_APPROVAL status. Current status: ${po.status}`);
    }

    // Check if there is an existing active approval workflow
    const existingInstance = await this.repository.findInstanceByPOId(purchaseOrderId, userId);
    if (existingInstance && (existingInstance.status === 'PENDING' || existingInstance.status === 'IN_PROGRESS')) {
      throw new ConflictException('An active approval workflow already exists for this Purchase Order');
    }

    // 2. Determine approval rule based on amount
    const rule = await this.repository.findActiveRuleForAmount(po.total, userId);
    if (!rule) {
      throw new BadRequestException(`No approval rule configured for amount: ${po.total}`);
    }

    const roles = rule.roleSequence as string[];
    if (!roles || roles.length === 0) {
      throw new BadRequestException('Matching approval rule has no roles configured');
    }

    // 3. Generate instance and steps
    const instance = await this.repository.createInstance(userId, purchaseOrderId, rule.id, roles);

    // 4. Update instance state to IN_PROGRESS and PO state to UNDER_APPROVAL
    await this.repository.updateInstance(instance.id, 'IN_PROGRESS', 0);
    await this.repository.updatePOStatus(purchaseOrderId, userId, PurchaseStatus.UNDER_APPROVAL);

    // 5. Emit events
    this.eventEmitter.emit('approval.started', new ApprovalWorkflowStartedEvent(instance.id, purchaseOrderId, userId));
    
    const firstStep = instance.steps[0];
    this.eventEmitter.emit(
      'approval.assigned',
      new ApprovalAssignedEvent(instance.id, firstStep.id, firstStep.role, userId),
    );

    return this.repository.findInstanceById(instance.id, userId);
  }

  async approve(
    instanceId: string,
    userId: string,
    approverRole: string,
    approverId: string,
    comment?: string,
    ipAddress?: string,
    deviceInfo?: string,
  ) {
    const instance = await this.repository.findInstanceById(instanceId, userId);
    if (!instance) {
      throw new NotFoundException(`Approval workflow with ID ${instanceId} not found`);
    }

    if (instance.status !== 'IN_PROGRESS' && instance.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve. Workflow is already ${instance.status}`);
    }

    const currentStep = instance.steps.find((step) => step.level === instance.currentLevel);
    if (!currentStep) {
      throw new Error(`Inconsistent workflow state: level ${instance.currentLevel} step not found`);
    }

    // Validate Approver Role
    if (currentStep.role.toLowerCase() !== approverRole.toLowerCase()) {
      throw new BadRequestException(
        `Approver role "${approverRole}" does not match current step role requirements: "${currentStep.role}"`,
      );
    }

    // Sequential approval validation: Level 2 cannot approve before Level 1, which is automatically handled
    // by checking that currentLevel matches this step's level.
    if (currentStep.status !== 'PENDING') {
      throw new BadRequestException('This approval step has already been actioned');
    }

    // Update step
    await this.repository.updateStepStatus(currentStep.id, 'APPROVED', approverId, comment);

    // Create action log
    await this.repository.createAction({
      userId,
      purchaseOrderId: instance.purchaseOrderId,
      instanceId,
      performedBy: approverId,
      action: 'APPROVE',
      level: currentStep.level,
      comment,
      ipAddress,
      deviceInfo,
    });

    this.eventEmitter.emit(
      'approval.approved',
      new ApprovalApprovedEvent(instanceId, currentStep.id, approverId, currentStep.level, userId),
    );

    // Check if final level
    if (instance.currentLevel < instance.steps.length - 1) {
      // Move to next step
      const nextLevel = instance.currentLevel + 1;
      await this.repository.updateInstance(instanceId, 'IN_PROGRESS', nextLevel);

      const nextStep = instance.steps.find((s) => s.level === nextLevel);
      if (nextStep) {
        this.eventEmitter.emit(
          'approval.assigned',
          new ApprovalAssignedEvent(instanceId, nextStep.id, nextStep.role, userId),
        );
      }
    } else {
      // Final approver approved
      await this.repository.updateInstance(instanceId, 'APPROVED', instance.currentLevel);
      await this.repository.updatePOStatus(instance.purchaseOrderId, userId, PurchaseStatus.APPROVED);

      this.eventEmitter.emit('po.approved', new PurchaseOrderApprovedEvent(instance.purchaseOrderId, userId));
      this.eventEmitter.emit('po.ready-to-send', new PurchaseOrderReadyToSendEvent(instance.purchaseOrderId, userId));
    }

    return this.repository.findInstanceById(instanceId, userId);
  }

  async reject(
    instanceId: string,
    userId: string,
    approverRole: string,
    approverId: string,
    comment?: string,
    ipAddress?: string,
    deviceInfo?: string,
  ) {
    const instance = await this.repository.findInstanceById(instanceId, userId);
    if (!instance) {
      throw new NotFoundException(`Approval workflow with ID ${instanceId} not found`);
    }

    if (instance.status !== 'IN_PROGRESS' && instance.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject. Workflow is already ${instance.status}`);
    }

    const currentStep = instance.steps.find((step) => step.level === instance.currentLevel);
    if (!currentStep) {
      throw new Error(`Inconsistent workflow state: level ${instance.currentLevel} step not found`);
    }

    // Validate Approver Role
    if (currentStep.role.toLowerCase() !== approverRole.toLowerCase()) {
      throw new BadRequestException(
        `Approver role "${approverRole}" does not match current step role requirements: "${currentStep.role}"`,
      );
    }

    // Update step
    await this.repository.updateStepStatus(currentStep.id, 'REJECTED', approverId, comment);

    // Create action log
    await this.repository.createAction({
      userId,
      purchaseOrderId: instance.purchaseOrderId,
      instanceId,
      performedBy: approverId,
      action: 'REJECT',
      level: currentStep.level,
      comment,
      ipAddress,
      deviceInfo,
    });

    this.eventEmitter.emit(
      'approval.rejected',
      new ApprovalRejectedEvent(instanceId, currentStep.id, approverId, currentStep.level, userId),
    );

    // Rejection immediately terminates workflow and sets PO to REJECTED
    await this.repository.updateInstance(instanceId, 'REJECTED', instance.currentLevel);
    await this.repository.updatePOStatus(instance.purchaseOrderId, userId, PurchaseStatus.REJECTED);

    this.eventEmitter.emit('po.rejected', new PurchaseOrderRejectedEvent(instance.purchaseOrderId, userId));

    return this.repository.findInstanceById(instanceId, userId);
  }

  async addComment(
    instanceId: string,
    userId: string,
    performedBy: string,
    comment: string,
    level: number,
  ) {
    const instance = await this.repository.findInstanceById(instanceId, userId);
    if (!instance) {
      throw new NotFoundException(`Approval workflow with ID ${instanceId} not found`);
    }

    const action = await this.repository.createAction({
      userId,
      purchaseOrderId: instance.purchaseOrderId,
      instanceId,
      performedBy,
      action: 'COMMENT',
      level,
      comment,
    });

    return action;
  }

  async getHistory(purchaseOrderId: string, userId: string) {
    const po = await this.poRepository.findByIdWithDetails(purchaseOrderId, userId);
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${purchaseOrderId} not found`);
    }
    return this.repository.getApprovalHistory(purchaseOrderId, userId);
  }

  async listPending(
    userId: string,
    userRole: string,
    params: { page: number; pageSize: number },
  ) {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(100, params.pageSize));
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repository.listPendingApprovals(userId, userRole, skip, pageSize);
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
