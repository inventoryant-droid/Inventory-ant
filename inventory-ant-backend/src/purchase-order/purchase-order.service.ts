import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PurchaseOrderRepository } from './purchase-order.repository';
import { SupplierQuotationRepository } from '../supplier-quotation/supplier-quotation.repository';
import { RequestForQuotationRepository } from '../request-for-quotation/request-for-quotation.repository';
import { SupplierRepository } from '../supplier/supplier.repository';
import { PurchaseOrderEventEmitter } from './domain/events/po-event-emitter';
import {
  PurchaseOrderCreatedEvent,
  PurchaseOrderUpdatedEvent,
  PurchaseOrderSubmittedEvent,
  PurchaseOrderCancelledEvent,
  PurchaseOrderReadyForApprovalEvent,
} from './domain/events/po.events';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { PurchaseOrder, PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly repository: PurchaseOrderRepository,
    private readonly quotationRepository: SupplierQuotationRepository,
    private readonly rfqRepository: RequestForQuotationRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: PurchaseOrderEventEmitter,
  ) {}

  async create(userId: string, createdBy: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    // 1. Verify SupplierQuotation exists, belongs to tenant, and status is SELECTED
    const quotation = await this.quotationRepository.findByIdWithDetails(dto.quotationId, userId);
    if (!quotation) {
      throw new NotFoundException(`Supplier Quotation with ID ${dto.quotationId} not found`);
    }

    if (quotation.status !== 'SELECTED') {
      throw new BadRequestException(`Cannot create PO. Quotation status must be SELECTED. Current status: ${quotation.status}`);
    }

    // 2. Verify RFQ exists, is not deleted, and is READY_FOR_PO
    const rfq = await this.rfqRepository.findByIdWithDetails(quotation.rfqId, userId);
    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${quotation.rfqId} not found`);
    }

    if (rfq.status !== 'READY_FOR_PO') {
      throw new BadRequestException(`Cannot create PO. RFQ status must be READY_FOR_PO. Current status: ${rfq.status}`);
    }

    // 3. Verify Supplier exists, is active, and not deleted
    const supplier = await this.supplierRepository.findById(quotation.supplierId, userId);
    if (!supplier || supplier.isDeleted || !supplier.isActive) {
      throw new BadRequestException('Supplier is inactive or deleted');
    }

    // 4. Verify Warehouse exists and belongs to tenant
    const warehouse = await this.repository.findWarehouse(dto.warehouseId, userId);
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not exist or is inactive');
    }

    // 5. Prevent duplicate Purchase Order for the same quotation
    const hasDuplicate = await this.repository.hasExistingPOForQuotation(dto.quotationId, userId);
    if (hasDuplicate) {
      throw new ConflictException('A Purchase Order has already been generated for this quotation');
    }

    // 6. Calculate Totals
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;

    for (const item of quotation.items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.quantity * item.discount;
      const itemTax = (itemSubtotal - itemDiscount) * (item.taxRate / 100);
      const itemTotal = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      discount += itemDiscount;
      tax += itemTax;
      total += itemTotal;
    }

    // 7. Generate unique PO number
    const poNumber = await this.repository.generatePONumber(userId);

    const po = await this.repository.create(
      userId,
      createdBy,
      poNumber,
      dto,
      quotation,
      { subtotal, discount, tax, total },
    );

    this.eventEmitter.emit(
      'po.created',
      new PurchaseOrderCreatedEvent(po.id, po.poNumber, userId, createdBy),
    );

    return po;
  }

  async update(id: string, userId: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    // Can only edit if in DRAFT state
    if (existing.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(`Cannot update Purchase Order. Status is currently: ${existing.status}`);
    }

    // If warehouse is updated, validate it
    if (dto.warehouseId) {
      const warehouse = await this.repository.findWarehouse(dto.warehouseId, userId);
      if (!warehouse) {
        throw new BadRequestException('Warehouse does not exist or is inactive');
      }
    }

    const updated = await this.repository.update(id, userId, dto);

    this.eventEmitter.emit('po.updated', new PurchaseOrderUpdatedEvent(id, userId));

    return updated;
  }

  async submit(id: string, userId: string): Promise<PurchaseOrder> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    if (existing.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(`Cannot submit Purchase Order. Status is currently: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, PurchaseStatus.PENDING_APPROVAL);

    this.eventEmitter.emit('po.submitted', new PurchaseOrderSubmittedEvent(id, userId));
    this.eventEmitter.emit('po.ready-for-approval', new PurchaseOrderReadyForApprovalEvent(id, userId));

    return updated;
  }

  async cancel(id: string, userId: string): Promise<PurchaseOrder> {
    const existing = await this.repository.findByIdWithDetails(id, userId);
    if (!existing) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    if (existing.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(`Cannot cancel Purchase Order. Only DRAFT orders can be cancelled. Current status: ${existing.status}`);
    }

    const updated = await this.repository.updateStatus(id, userId, PurchaseStatus.CANCELLED);

    this.eventEmitter.emit('po.cancelled', new PurchaseOrderCancelledEvent(id, userId));

    return updated;
  }

  async findById(id: string, userId: string): Promise<PurchaseOrder> {
    const po = await this.repository.findByIdWithDetails(id, userId);
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }
    return po;
  }

  async list(
    userId: string,
    params: { page: number; pageSize: number; search?: string; status?: PurchaseStatus },
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
}
