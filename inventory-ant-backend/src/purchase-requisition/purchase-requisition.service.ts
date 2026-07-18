import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchaseRequisitionRepository } from './purchase-requisition.repository';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { PurchaseRequisitionEventEmitter } from './domain/events/purchase-requisition-event-emitter';
import {
  RequisitionCreatedEvent,
  RequisitionSubmittedEvent,
  RequisitionApprovedEvent,
  RequisitionRejectedEvent,
} from './domain/events/requisition.events';
import { PurchaseRequisition } from '@prisma/client';

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    private readonly repository: PurchaseRequisitionRepository,
    private readonly eventEmitter: PurchaseRequisitionEventEmitter,
  ) {}

  private async validateVariants(items: Array<{ variantId: string }>, tenantEmail: string) {
    const variantIds = items.map((i) => i.variantId);
    
    // Check for duplicate variants in the same request payload
    const uniqueIds = new Set(variantIds);
    if (uniqueIds.size !== variantIds.length) {
      throw new BadRequestException('Duplicate product variants detected in requisition items list');
    }

    const dbVariants = await this.repository.findActiveVariants(variantIds, tenantEmail);
    if (dbVariants.length !== uniqueIds.size) {
      throw new BadRequestException('One or more selected product variants are invalid or do not belong to the tenant');
    }
  }

  async create(userId: string, tenantEmail: string, dto: CreateRequisitionDto): Promise<PurchaseRequisition> {
    // Validate variants first
    await this.validateVariants(dto.items, tenantEmail);

    const requisition = await this.repository.create(userId, dto);

    this.eventEmitter.emit(
      'requisition.created',
      new RequisitionCreatedEvent(requisition.id, userId, dto.requestorId),
    );

    return requisition;
  }

  async update(id: string, userId: string, tenantEmail: string, dto: UpdateRequisitionDto): Promise<PurchaseRequisition> {
    const existing = await this.repository.findByIdWithItems(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }

    // Update is only allowed in DRAFT status
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot update requisition. Status is currently: ${existing.status}`);
    }

    // Validate new variants if provided
    if (dto.items) {
      await this.validateVariants(dto.items, tenantEmail);
    }

    return this.repository.update(id, userId, dto);
  }

  async findById(id: string, userId: string): Promise<PurchaseRequisition> {
    const requisition = await this.repository.findByIdWithItems(id, userId);
    if (!requisition) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async list(
    userId: string,
    params: { page: number; pageSize: number; search?: string; status?: string },
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(100, params.pageSize));
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repository.list(userId, {
      skip,
      take: pageSize,
      search: params.search,
      status: params.status,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async submit(id: string, userId: string): Promise<PurchaseRequisition> {
    const existing = await this.repository.findByIdWithItems(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }

    // Can only submit DRAFT requisitions
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot submit requisition. Status is currently: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'PENDING_APPROVAL');

    this.eventEmitter.emit(
      'requisition.submitted',
      new RequisitionSubmittedEvent(id, userId),
    );

    return updated;
  }

  async approve(id: string, userId: string): Promise<PurchaseRequisition> {
    const existing = await this.repository.findByIdWithItems(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }

    // Can only approve PENDING_APPROVAL requisitions
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot approve requisition. Status is currently: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'APPROVED');

    this.eventEmitter.emit(
      'requisition.approved',
      new RequisitionApprovedEvent(id, userId),
    );

    return updated;
  }

  async reject(id: string, userId: string, reason: string): Promise<PurchaseRequisition> {
    const existing = await this.repository.findByIdWithItems(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }

    // Can only reject PENDING_APPROVAL requisitions
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot reject requisition. Status is currently: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'REJECTED');

    this.eventEmitter.emit(
      'requisition.rejected',
      new RequisitionRejectedEvent(id, userId, reason),
    );

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<PurchaseRequisition> {
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`Purchase Requisition with ID ${id} not found`);
    }
    return this.repository.softDelete(id, userId);
  }
}
