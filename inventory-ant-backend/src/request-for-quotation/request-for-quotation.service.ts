import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { RequestForQuotationRepository } from './request-for-quotation.repository';
import { PurchaseRequisitionRepository } from '../purchase-requisition/purchase-requisition.repository';
import { SupplierRepository } from '../supplier/supplier.repository';
import { RFQEventEmitter } from './domain/events/rfq-event-emitter';
import {
  RFQCreatedEvent,
  RFQUpdatedEvent,
  RFQSentEvent,
  RFQResponsesClosedEvent,
  RFQClosedEvent,
  SupplierAddedToRFQEvent,
  SupplierRemovedFromRFQEvent,
} from './domain/events/rfq.events';
import { CreateRFQDto } from './dto/create-rfq.dto';
import { UpdateRFQDto } from './dto/update-rfq.dto';
import { RequestForQuotation, RFQSupplier } from '@prisma/client';

@Injectable()
export class RequestForQuotationService {
  constructor(
    private readonly repository: RequestForQuotationRepository,
    private readonly requisitionRepository: PurchaseRequisitionRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: RFQEventEmitter,
  ) {}

  async create(userId: string, createdBy: string, dto: CreateRFQDto): Promise<RequestForQuotation> {
    // 1. Validate Requisition exists and belongs to tenant
    const requisition = await this.requisitionRepository.findByIdWithItems(dto.requisitionId, userId);
    if (!requisition) {
      throw new NotFoundException(`Purchase Requisition with ID ${dto.requisitionId} not found`);
    }

    // 2. Validate Requisition status is APPROVED
    if (requisition.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot create RFQ. Requisition status must be APPROVED. Current status: ${requisition.status}`);
    }

    // 3. Prevent duplicate active RFQs for the same requisition
    const hasActiveRFQ = await this.repository.checkRequisitionHasActiveRFQ(dto.requisitionId, userId);
    if (hasActiveRFQ) {
      throw new ConflictException(`An active Request For Quotation already exists for Requisition ${dto.requisitionId}`);
    }

    // 4. Generate readable RFQ number
    const rfqNumber = await this.repository.generateRFQNumber(userId);
    const expiryDate = new Date(dto.expiryDate);

    // 5. Create RFQ copying all items
    const rfq = await this.repository.createFromRequisition(
      userId,
      createdBy,
      rfqNumber,
      expiryDate,
      requisition,
    );

    this.eventEmitter.emit(
      'rfq.created',
      new RFQCreatedEvent(rfq.id, rfq.rfqNumber, userId, createdBy),
    );

    return rfq;
  }

  async update(id: string, userId: string, dto: UpdateRFQDto): Promise<RequestForQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot update RFQ. Status must be DRAFT. Current status: ${existing.status}`);
    }

    const updated = await this.repository.update(id, userId, dto);

    this.eventEmitter.emit('rfq.updated', new RFQUpdatedEvent(id, userId));

    return updated;
  }

  async addSupplier(id: string, userId: string, supplierId: string): Promise<RFQSupplier> {
    // 1. Verify RFQ exists and is in DRAFT
    const rfq = await this.repository.findByIdWithDetails(id, userId);
    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (rfq.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot add supplier to RFQ. Status must be DRAFT. Current status: ${rfq.status}`);
    }

    // 2. Verify Supplier exists and belongs to tenant
    const supplier = await this.supplierRepository.findById(supplierId, userId);
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // 3. Verify Supplier is active and not soft-deleted
    if (!supplier.isActive || supplier.isDeleted) {
      throw new BadRequestException(`Supplier with ID ${supplierId} is either inactive or deleted`);
    }

    // 4. Verify Supplier is not already assigned
    const alreadyAssigned = rfq.suppliers.some((s) => s.supplierId === supplierId);
    if (alreadyAssigned) {
      throw new ConflictException(`Supplier with ID ${supplierId} is already assigned to this RFQ`);
    }

    const connection = await this.repository.addSupplierToRFQ(id, supplierId);

    this.eventEmitter.emit(
      'rfq.supplier.added',
      new SupplierAddedToRFQEvent(id, supplierId, userId),
    );

    return connection;
  }

  async removeSupplier(id: string, userId: string, supplierId: string): Promise<RFQSupplier> {
    // 1. Verify RFQ exists and is in DRAFT
    const rfq = await this.repository.findByIdWithDetails(id, userId);
    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (rfq.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot remove supplier from RFQ. Status must be DRAFT. Current status: ${rfq.status}`);
    }

    // 2. Verify Supplier connection exists
    const hasSupplier = rfq.suppliers.some((s) => s.supplierId === supplierId);
    if (!hasSupplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} is not assigned to this RFQ`);
    }

    const removed = await this.repository.removeSupplierFromRFQ(id, supplierId);

    this.eventEmitter.emit(
      'rfq.supplier.removed',
      new SupplierRemovedFromRFQEvent(id, supplierId, userId),
    );

    return removed;
  }

  async getSuppliers(id: string, userId: string) {
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }
    return this.repository.getSuppliersForRFQ(id, userId);
  }

  async findById(id: string, userId: string): Promise<RequestForQuotation> {
    const rfq = await this.repository.findByIdWithDetails(id, userId);
    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }
    return rfq;
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

  async send(id: string, userId: string): Promise<RequestForQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot send RFQ. Status must be DRAFT. Current status: ${existing.status}`);
    }

    // Must have at least 1 supplier assigned
    if (existing.suppliers.length === 0) {
      throw new BadRequestException('Cannot send RFQ. At least one supplier must be assigned');
    }

    const updated = await this.repository.updateStatus(id, userId, 'SENT');

    this.eventEmitter.emit('rfq.sent', new RFQSentEvent(id, userId));

    return updated;
  }

  async closeResponses(id: string, userId: string): Promise<RequestForQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (existing.status !== 'SENT') {
      throw new BadRequestException(`Cannot close responses. Status must be SENT. Current status: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'RESPONSES_CLOSED');

    this.eventEmitter.emit('rfq.responses-closed', new RFQResponsesClosedEvent(id, userId));

    return updated;
  }

  async close(id: string, userId: string): Promise<RequestForQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (existing.status !== 'RESPONSES_CLOSED') {
      throw new BadRequestException(`Cannot close RFQ. Status must be RESPONSES_CLOSED. Current status: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'CLOSED');

    this.eventEmitter.emit('rfq.closed', new RFQClosedEvent(id, userId));

    return updated;
  }
}
