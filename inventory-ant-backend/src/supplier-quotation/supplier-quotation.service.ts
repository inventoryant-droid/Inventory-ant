import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupplierQuotationRepository } from './supplier-quotation.repository';
import { RequestForQuotationRepository } from '../request-for-quotation/request-for-quotation.repository';
import { SupplierRepository } from '../supplier/supplier.repository';
import { QuotationEventEmitter } from './domain/events/quotation-event-emitter';
import {
  QuotationSubmittedEvent,
  QuotationUpdatedEvent,
  QuotationWithdrawnEvent,
  QuotationReviewStartedEvent,
  QuotationSelectedEvent,
  QuotationRejectedEvent,
  WinningQuotationSelectedEvent,
  RFQReadyForPurchaseOrderEvent,
} from './domain/events/quotation.events';
import { SubmitQuotationDto } from './dto/submit-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { SupplierQuotation } from '@prisma/client';

@Injectable()
export class SupplierQuotationService {
  constructor(
    private readonly repository: SupplierQuotationRepository,
    private readonly rfqRepository: RequestForQuotationRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: QuotationEventEmitter,
  ) {}

  private async validateQuotationItems(items: Array<{ variantId: string }>, tenantEmail: string) {
    const variantIds = items.map((i) => i.variantId);
    
    const uniqueIds = new Set(variantIds);
    if (uniqueIds.size !== variantIds.length) {
      throw new BadRequestException('Duplicate product variants detected in quotation items list');
    }

    const dbVariants = await this.rfqRepository.findActiveVariants(variantIds, tenantEmail);
    if (dbVariants.length !== uniqueIds.size) {
      throw new BadRequestException('One or more selected product variants are invalid or do not belong to the tenant');
    }
  }

  async submit(userId: string, tenantEmail: string, dto: SubmitQuotationDto): Promise<SupplierQuotation> {
    // 1. Verify RFQ exists, belongs to tenant, and is in SENT status
    const rfq = await this.rfqRepository.findByIdWithDetails(dto.rfqId, userId);
    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${dto.rfqId} not found`);
    }

    if (rfq.status !== 'SENT') {
      throw new BadRequestException(`Cannot submit quotation. RFQ status must be SENT. Current status: ${rfq.status}`);
    }

    // 2. Verify submission is before expiryDate
    if (new Date() > new Date(rfq.expiryDate)) {
      throw new BadRequestException(`Cannot submit quotation. RFQ has expired`);
    }

    // 3. Verify Supplier exists, is active, not deleted, and belongs to tenant
    const supplier = await this.supplierRepository.findById(dto.supplierId, userId);
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${dto.supplierId} not found`);
    }

    if (!supplier.isActive || supplier.isDeleted) {
      throw new BadRequestException(`Supplier with ID ${dto.supplierId} is inactive or deleted`);
    }

    // 4. Verify Supplier is assigned to the RFQ
    const isAssigned = rfq.suppliers.some((s) => s.supplierId === dto.supplierId);
    if (!isAssigned) {
      throw new BadRequestException(`Supplier with ID ${dto.supplierId} is not assigned to this RFQ`);
    }

    // 5. Verify Supplier has not already submitted an active quotation for this RFQ
    const activeQuotation = await this.repository.findActiveQuotationForSupplier(dto.rfqId, dto.supplierId, userId);
    if (activeQuotation) {
      throw new ConflictException(`Supplier with ID ${dto.supplierId} has already submitted an active quotation for this RFQ`);
    }

    // 6. Validate items
    await this.validateQuotationItems(dto.items, tenantEmail);

    const quotation = await this.repository.submit(userId, dto);

    this.eventEmitter.emit(
      'quotation.submitted',
      new QuotationSubmittedEvent(quotation.id, dto.rfqId, dto.supplierId, userId),
    );

    return quotation;
  }

  async update(id: string, userId: string, tenantEmail: string, dto: UpdateQuotationDto): Promise<SupplierQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot update quotation. Status must be SUBMITTED. Current status: ${existing.status}`);
    }

    await this.validateQuotationItems(dto.items, tenantEmail);

    const updated = await this.repository.update(id, userId, dto);

    this.eventEmitter.emit('quotation.updated', new QuotationUpdatedEvent(id, userId));

    return updated;
  }

  async withdraw(id: string, userId: string): Promise<SupplierQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot withdraw quotation. Status must be SUBMITTED (before review). Current status: ${existing.status}`);
    }

    const deleted = await this.repository.withdraw(id, userId);

    this.eventEmitter.emit('quotation.withdrawn', new QuotationWithdrawnEvent(id, userId));

    return deleted;
  }

  async review(id: string, userId: string): Promise<SupplierQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot mark quotation under review. Status must be SUBMITTED. Current status: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'UNDER_REVIEW');

    this.eventEmitter.emit('quotation.review-started', new QuotationReviewStartedEvent(id, userId));

    return updated;
  }

  async select(id: string, userId: string): Promise<SupplierQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (existing.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Cannot select quotation. Status must be UNDER_REVIEW. Current status: ${existing.status}`);
    }

    // 1. Update selected quotation status to SELECTED
    const selected = await this.repository.updateStatus(id, userId, 'SELECTED');

    // 2. Auto reject all other quotations for the same RFQ
    await this.repository.rejectOtherQuotations(existing.rfqId, id, userId);

    // 3. Transition RFQ status to READY_FOR_PO
    await this.repository.updateRFQStatus(existing.rfqId, userId, 'READY_FOR_PO');

    // 4. Emit domain events
    this.eventEmitter.emit('quotation.selected', new QuotationSelectedEvent(id, userId));
    this.eventEmitter.emit('quotation.winning-selected', new WinningQuotationSelectedEvent(id, existing.rfqId, userId));
    this.eventEmitter.emit('rfq.ready-for-po', new RFQReadyForPurchaseOrderEvent(existing.rfqId, userId));

    return selected;
  }

  async reject(id: string, userId: string): Promise<SupplierQuotation> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (existing.status !== 'SUBMITTED' && existing.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Cannot reject quotation. Status must be SUBMITTED or UNDER_REVIEW. Current status: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, 'REJECTED');

    this.eventEmitter.emit('quotation.rejected', new QuotationRejectedEvent(id, userId));

    return updated;
  }

  async findById(id: string, userId: string): Promise<SupplierQuotation> {
    const quotation = await this.repository.findByIdWithDetails(id, userId);
    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }
    return quotation;
  }

  async list(
    userId: string,
    params: { page: number; pageSize: number; search?: string; rfqId?: string },
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(100, params.pageSize));
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repository.list(userId, {
      skip,
      take: pageSize,
      search: params.search,
      rfqId: params.rfqId,
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
}
