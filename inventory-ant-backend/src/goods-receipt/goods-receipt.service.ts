import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoodsReceiptRepository } from './goods-receipt.repository';
import { InventoryService } from '../inventory/application/services/inventory.service';
import { GoodsReceiptEventEmitter } from './domain/events/grn-event-emitter';
import {
  GoodsReceiptCreatedEvent,
  GoodsReceiptStartedEvent,
  GoodsReceiptCompletedEvent,
  GoodsReceiptCancelledEvent,
  PurchaseOrderPartiallyReceivedEvent,
  PurchaseOrderReceivedEvent,
  InventoryStockReceivedEvent,
} from './domain/events/grn.events';
import { CreateGoodsReceiptDto } from './dto/create-grn.dto';
import { PurchaseOrderRepository } from '../purchase-order/purchase-order.repository';
import { SupplierRepository } from '../supplier/supplier.repository';
import { PurchaseStatus, PurchaseReceive } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GoodsReceiptService {
  constructor(
    private readonly repository: GoodsReceiptRepository,
    private readonly poRepository: PurchaseOrderRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: GoodsReceiptEventEmitter,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, receivedBy: string, dto: CreateGoodsReceiptDto): Promise<PurchaseReceive> {
    // 1. Validate Purchase Order
    const po = await this.poRepository.findByIdWithDetails(dto.purchaseOrderId, userId);
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${dto.purchaseOrderId} not found`);
    }

    if (po.status !== PurchaseStatus.APPROVED && po.status !== PurchaseStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException(`Cannot receive goods for PO in status: ${po.status}`);
    }

    // 2. Validate Supplier
    const supplier = await this.supplierRepository.findById(po.supplierId, userId);
    if (!supplier || supplier.isDeleted || !supplier.isActive) {
      throw new BadRequestException('Supplier is inactive or deleted');
    }

    // 3. Validate items and warehouses
    const receivedTotals = await this.repository.getReceivedQuantitiesForPO(po.id, userId);

    for (const item of dto.items) {
      // Validate quantity > 0
      if (item.quantityReceived <= 0) {
        throw new BadRequestException('Received quantity must be greater than 0');
      }

      // Validate variant exists
      const variant = await this.repository.findVariant(item.variantId);
      if (!variant) {
        throw new BadRequestException(`Variant with ID ${item.variantId} not found`);
      }

      // Validate warehouse exists and is active
      const warehouse = await this.repository.findWarehouse(item.warehouseId, userId);
      if (!warehouse) {
        throw new BadRequestException(`Warehouse with ID ${item.warehouseId} does not exist or is inactive`);
      }

      // Validate remaining PO quantity
      const poItem = po.items.find((i) => i.variantId === item.variantId);
      if (!poItem) {
        throw new BadRequestException(`Variant ${item.variantId} is not part of Purchase Order`);
      }

      const alreadyReceived = receivedTotals[item.variantId] || 0;
      const remaining = poItem.quantity - alreadyReceived;
      if (item.quantityReceived > remaining) {
        throw new BadRequestException(
          `Received quantity (${item.quantityReceived}) for variant ${item.variantId} exceeds remaining PO quantity (${remaining})`,
        );
      }

      // Validate batch expiry
      if (item.expiryDate && item.manufacturingDate) {
        if (new Date(item.expiryDate) < new Date(item.manufacturingDate)) {
          throw new BadRequestException('Expiry date must be after manufacturing date');
        }
      }
    }

    const grnNumber = await this.repository.generateGRNNumber(userId);
    const grn = await this.repository.create(userId, receivedBy, grnNumber, dto);

    this.eventEmitter.emit(
      'grn.created',
      new GoodsReceiptCreatedEvent(grn.id, grn.grnNumber, dto.purchaseOrderId, userId),
    );

    return grn;
  }

  async receive(id: string, userId: string): Promise<PurchaseReceive> {
    const grn = await this.repository.findByIdWithDetails(id, userId);
    if (!grn) {
      throw new NotFoundException(`Goods Receipt with ID ${id} not found`);
    }

    if (grn.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot receive goods. Goods Receipt is already ${grn.status}`);
    }

    // Set GRN status to RECEIVING
    await this.repository.updateStatus(id, 'RECEIVING', userId);
    this.eventEmitter.emit('grn.started', new GoodsReceiptStartedEvent(id, userId));

    const po = await this.poRepository.findByIdWithDetails(grn.purchaseOrderId, userId);
    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const receivedTotals = await this.repository.getReceivedQuantitiesForPO(po.id, userId);

    // Process each item
    for (const item of grn.items) {
      // Check remaining PO quantity again to ensure no concurrent over-receive
      const poItem = po.items.find((i) => i.variantId === item.variantId);
      if (!poItem) {
        throw new BadRequestException(`Variant ${item.variantId} is not part of Purchase Order`);
      }

      const alreadyReceived = receivedTotals[item.variantId] || 0;
      const remaining = poItem.quantity - alreadyReceived;
      if (item.quantityReceived > remaining) {
        throw new BadRequestException(
          `Received quantity (${item.quantityReceived}) for variant ${item.variantId} exceeds remaining PO quantity (${remaining})`,
        );
      }

      // Register the ProductBatch if it does not exist (pre-requisite for stockIn)
      let batch = await this.prisma.productBatch.findFirst({
        where: {
          variantId: item.variantId,
          warehouseId: item.warehouseId,
          batchNumber: item.batchNumber,
        },
      });

      if (!batch) {
        batch = await this.prisma.productBatch.create({
          data: {
            variantId: item.variantId,
            warehouseId: item.warehouseId,
            batchNumber: item.batchNumber,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            purchasePrice: item.purchasePrice,
            mrp: item.mrp,
            availableQuantity: 0,
            reservedQuantity: 0,
            status: 'ACTIVE',
          },
        });
      }

      // Call InventoryService.stockIn
      await this.inventoryService.stockIn({
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        quantity: item.quantityReceived,
        batchNumber: item.batchNumber,
        referenceId: grn.id,
        operatorName: grn.receivedBy,
        notes: grn.notes || `Stock in from GRN ${grn.grnNumber}`,
        purchasePrice: item.purchasePrice,
        mrp: item.mrp,
      });

      this.eventEmitter.emit(
        'inventory.stock-received',
        new InventoryStockReceivedEvent(grn.id, item.variantId, item.quantityReceived, item.batchNumber, item.warehouseId, userId),
      );
    }

    // Complete GRN status
    await this.repository.updateStatus(id, 'COMPLETED', userId);
    this.eventEmitter.emit('grn.completed', new GoodsReceiptCompletedEvent(id, userId));

    // Update PO Status (PARTIALLY_RECEIVED or RECEIVED)
    const updatedReceivedTotals = await this.repository.getReceivedQuantitiesForPO(po.id, userId);

    let allReceived = true;
    for (const poItem of po.items) {
      const totalRec = (updatedReceivedTotals[poItem.variantId] || 0) + 
                       (grn.items.find(i => i.variantId === poItem.variantId)?.quantityReceived || 0);
      if (totalRec < poItem.quantity) {
        allReceived = false;
        break;
      }
    }

    if (allReceived) {
      await this.repository.updatePOStatus(po.id, userId, PurchaseStatus.RECEIVED);
      this.eventEmitter.emit('po.received', new PurchaseOrderReceivedEvent(po.id, userId));
    } else {
      await this.repository.updatePOStatus(po.id, userId, PurchaseStatus.PARTIALLY_RECEIVED);
      this.eventEmitter.emit('po.partially-received', new PurchaseOrderPartiallyReceivedEvent(po.id, userId));
    }

    return this.repository.findByIdWithDetails(id, userId) as any;
  }

  async cancel(id: string, userId: string): Promise<PurchaseReceive> {
    const grn = await this.repository.findByIdWithDetails(id, userId);
    if (!grn) {
      throw new NotFoundException(`Goods Receipt with ID ${id} not found`);
    }

    if (grn.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot cancel Goods Receipt. Status is currently: ${grn.status}`);
    }

    const updated = await this.repository.updateStatus(id, 'CANCELLED', userId);
    this.eventEmitter.emit('grn.cancelled', new GoodsReceiptCancelledEvent(id, userId));

    return updated;
  }

  async findById(id: string, userId: string): Promise<PurchaseReceive> {
    const grn = await this.repository.findByIdWithDetails(id, userId);
    if (!grn) {
      throw new NotFoundException(`Goods Receipt with ID ${id} not found`);
    }
    return grn;
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
