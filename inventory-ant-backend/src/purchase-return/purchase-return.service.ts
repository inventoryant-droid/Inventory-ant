import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchaseReturnRepository } from './purchase-return.repository';
import { GoodsReceiptRepository } from '../goods-receipt/goods-receipt.repository';
import { PurchaseOrderRepository } from '../purchase-order/purchase-order.repository';
import { SupplierRepository } from '../supplier/supplier.repository';
import { InventoryService } from '../inventory/application/services/inventory.service';
import { PurchaseReturnEventEmitter } from './domain/events/return-event-emitter';
import {
  PurchaseReturnCreatedEvent,
  PurchaseReturnApprovedEvent,
  PurchaseReturnCompletedEvent,
  PurchaseReturnCancelledEvent,
  InventoryStockReturnedEvent,
  SupplierCreditPendingEvent,
} from './domain/events/return.events';
import { CreatePurchaseReturnDto } from './dto/create-return.dto';
import { PurchaseReturn } from '@prisma/client';

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly repository: PurchaseReturnRepository,
    private readonly grnRepository: GoodsReceiptRepository,
    private readonly poRepository: PurchaseOrderRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: PurchaseReturnEventEmitter,
  ) {}

  async create(userId: string, createdBy: string, dto: CreatePurchaseReturnDto): Promise<PurchaseReturn> {
    // 1. Validate Goods Receipt (GRN)
    const grn = await this.grnRepository.findByIdWithDetails(dto.goodsReceiptId, userId);
    if (!grn) {
      throw new NotFoundException(`Goods Receipt with ID ${dto.goodsReceiptId} not found`);
    }

    if (grn.status !== 'COMPLETED') {
      throw new BadRequestException(`Cannot create return. Goods Receipt is currently in status: ${grn.status}`);
    }

    // 2. Validate Purchase Order
    const po = await this.poRepository.findByIdWithDetails(dto.purchaseOrderId, userId);
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${dto.purchaseOrderId} not found`);
    }

    // 3. Validate Supplier
    const supplier = await this.supplierRepository.findById(po.supplierId, userId);
    if (!supplier || supplier.isDeleted || !supplier.isActive) {
      throw new BadRequestException('Supplier is inactive or deleted');
    }

    const returnedTotals = await this.repository.getReturnedQuantitiesForGRN(grn.id, userId);

    // 4. Validate Items
    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException('Return quantity must be greater than 0');
      }

      // Validate Variant
      const variant = await this.repository.findVariant(item.variantId);
      if (!variant) {
        throw new BadRequestException(`Variant with ID ${item.variantId} not found`);
      }

      // Validate Warehouse
      const warehouse = await this.repository.findWarehouse(item.warehouseId, userId);
      if (!warehouse) {
        throw new BadRequestException(`Warehouse with ID ${item.warehouseId} does not exist or is inactive`);
      }

      // Validate Batch
      const batch = await this.repository.findBatch(item.batchId);
      if (!batch) {
        throw new BadRequestException(`Batch with ID ${item.batchId} not found`);
      }

      // Match item received in GRN by Variant and Batch Number
      const grnItem = grn.items.find(
        (i) => i.variantId === item.variantId && i.batchNumber === batch.batchNumber,
      );
      if (!grnItem) {
        throw new BadRequestException(
          `Selected batch (${batch.batchNumber}) and variant (${item.variantId}) were not received in this Goods Receipt`,
        );
      }

      const key = `${item.variantId}_${item.batchId}`;
      const alreadyReturned = returnedTotals[key] || 0;
      const remaining = grnItem.quantityReceived - alreadyReturned;

      if (item.quantity > remaining) {
        throw new BadRequestException(
          `Return quantity (${item.quantity}) exceeds remaining received quantity (${remaining}) for variant ${item.variantId} and batch ${batch.batchNumber}`,
        );
      }
    }

    const returnNumber = await this.repository.generatePRTNNumber(userId);
    const returnRecord = await this.repository.create(userId, createdBy, returnNumber, dto);

    this.eventEmitter.emit(
      'return.created',
      new PurchaseReturnCreatedEvent(returnRecord.id, returnRecord.returnNumber, dto.purchaseOrderId, dto.goodsReceiptId, userId),
    );

    return returnRecord;
  }

  async approve(id: string, userId: string): Promise<PurchaseReturn> {
    const returnRecord = await this.repository.findByIdWithDetails(id, userId);
    if (!returnRecord) {
      throw new NotFoundException(`Purchase Return with ID ${id} not found`);
    }

    if (returnRecord.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve return. Status is currently: ${returnRecord.status}`);
    }

    const updated = await this.repository.updateStatus(id, 'APPROVED', userId);

    this.eventEmitter.emit('return.approved', new PurchaseReturnApprovedEvent(id, userId));

    return updated;
  }

  async complete(id: string, userId: string): Promise<PurchaseReturn> {
    const returnRecord = await this.repository.findByIdWithDetails(id, userId);
    if (!returnRecord) {
      throw new NotFoundException(`Purchase Return with ID ${id} not found`);
    }

    if (returnRecord.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot complete return. Return must be APPROVED first. Current status: ${returnRecord.status}`);
    }

    const returnedTotals = await this.repository.getReturnedQuantitiesForGRN(returnRecord.goodsReceiptId, userId);

    // Double check quantities and execute stockOut
    for (const item of returnRecord.items) {
      const batch = item.batch;
      const grnItem = returnRecord.goodsReceipt.items.find(
        (i) => i.variantId === item.variantId && i.batchNumber === batch.batchNumber,
      );
      if (!grnItem) {
        throw new BadRequestException(`Variant ${item.variantId} was not received in the Goods Receipt`);
      }

      const key = `${item.variantId}_${item.batchId}`;
      const alreadyReturned = returnedTotals[key] || 0;
      const remaining = grnItem.quantityReceived - alreadyReturned;

      if (item.quantity > remaining) {
        throw new BadRequestException(`Return quantity exceeds remaining received quantity for variant ${item.variantId}`);
      }

      // Call InventoryService.stockOut
      // Since stockOut expects tenant email as userId, we resolve user details to fetch the tenant email,
      // or we can pass the owner email. In user controller/services context, the userId passed is the tenant ID.
      // Wait, let's verify if `userId` in `stockOut` is the tenant email.
      // In `InventoryService.ts` line 189:
      // `await this.repository.findBusinessSettings(dto.userId, tx);`
      // Where `findBusinessSettings` queries by `userId` (which is User.id or email?).
      // In `InventoryRepository.ts` line 85:
      // `async findBusinessSettings(userId: string...): Promise<BusinessSettings | null> { return this.prisma.businessSettings.findUnique({ where: { userId } }); }`
      // Wait, so it expects user ID! Yes, `userId` is the owner ID. So passing `userId` as `userId` is completely correct!
      await this.inventoryService.stockOut({
        userId,
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
        referenceId: returnRecord.id,
        operatorName: returnRecord.createdBy,
        notes: returnRecord.notes || `Stock out from Purchase Return ${returnRecord.returnNumber}`,
      });

      this.eventEmitter.emit(
        'inventory.stock-returned',
        new InventoryStockReturnedEvent(returnRecord.id, item.variantId, item.quantity, item.batchId, item.warehouseId, userId),
      );
    }

    const updated = await this.repository.updateStatus(id, 'COMPLETED', userId);
    this.eventEmitter.emit('return.completed', new PurchaseReturnCompletedEvent(id, userId));

    const supplierId = returnRecord.purchaseOrder.supplierId;
    this.eventEmitter.emit('supplier.credit-pending', new SupplierCreditPendingEvent(id, supplierId, userId));

    return this.repository.findByIdWithDetails(id, userId) as any;
  }

  async cancel(id: string, userId: string): Promise<PurchaseReturn> {
    const returnRecord = await this.repository.findByIdWithDetails(id, userId);
    if (!returnRecord) {
      throw new NotFoundException(`Purchase Return with ID ${id} not found`);
    }

    if (returnRecord.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot cancel return. Only DRAFT returns can be cancelled. Current status: ${returnRecord.status}`);
    }

    const updated = await this.repository.updateStatus(id, 'CANCELLED', userId);
    this.eventEmitter.emit('return.cancelled', new PurchaseReturnCancelledEvent(id, userId));

    return updated;
  }

  async findById(id: string, userId: string): Promise<PurchaseReturn> {
    const returnRecord = await this.repository.findByIdWithDetails(id, userId);
    if (!returnRecord) {
      throw new NotFoundException(`Purchase Return with ID ${id} not found`);
    }
    return returnRecord;
  }

  async list(
    userId: string,
    params: { page: number; pageSize: number; search?: string },
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(100, params.pageSize));
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repository.list(userId, {
      skip,
      take: pageSize,
      search: params.search,
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
