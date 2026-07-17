import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma.service';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';
import { InventoryValidator } from '../validators/inventory.validator';
import { StrategyResolver } from './strategy.resolver';
import { StockInDto } from '../dto/stock-in.dto';
import { StockOutDto } from '../dto/stock-out.dto';
import { TransferDto } from '../dto/transfer.dto';
import { ReservationDto } from '../dto/reservation.dto';
import { AdjustmentDto } from '../dto/adjustment.dto';
import { InventoryEventEmitter } from '../../domain/events/inventory-event-emitter';
import { StockInCompletedEvent } from '../../domain/events/stock-in-completed.event';
import { StockOutCompletedEvent } from '../../domain/events/stock-out-completed.event';
import { TransferCompletedEvent } from '../../domain/events/transfer-completed.event';
import { ReservationCreatedEvent } from '../../domain/events/reservation-created.event';
import { ReservationReleasedEvent } from '../../domain/events/reservation-released.event';
import { BatchExpiredEvent } from '../../domain/events/batch-expired.event';
import { BatchDamagedEvent } from '../../domain/events/batch-damaged.event';
import { BatchNotFoundException, InsufficientStockException } from '../exceptions/inventory.exceptions';

export interface StockMovementResult {
  transactionId: string;
  batchId?: string;
  productId: string;
  variantId: string;
  quantity: number;
  warehouseId: string;
  completedAt: Date;
  requestedQuantity?: number;
  allocatedQuantity?: number;
  allocations?: any;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: InventoryRepository,
    private readonly validator: InventoryValidator,
    private readonly strategyResolver: StrategyResolver,
    private readonly eventEmitter: InventoryEventEmitter,
  ) {}

  private logOperation(
    type: string,
    userId: string,
    operationId: string,
    correlationId: string,
    latencyMs: number,
    status: 'SUCCESS' | 'FAILURE',
    details?: any,
  ) {
    const payload = {
      operationId,
      correlationId,
      userId,
      tenantId: userId,
      operationType: type,
      executionTimeMs: latencyMs,
      result: status,
      ...details,
    };

    if (status === 'SUCCESS') {
      this.logger.log(JSON.stringify(payload));
    } else {
      this.logger.error(JSON.stringify(payload));
    }
  }

  async stockIn(dto: StockInDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const variant = await this.repository.findVariantById(dto.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${dto.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        await this.repository.findBusinessSettings(product.userId, tx);
        await this.repository.findWarehouse(dto.warehouseId, tx);
        if (dto.storageLocationId) {
          await this.repository.findStorageLocation(dto.storageLocationId, tx);
        }

        await this.validator.validateBusinessSettings(product.userId, tx);
        await this.validator.validateWarehouse(dto.warehouseId, tx);
        if (dto.storageLocationId) {
          await this.validator.validateStorageLocation(dto.storageLocationId, dto.warehouseId, tx);
        }

        const batches = await this.repository.findVariantBatches(dto.variantId, tx);
        const batch = batches.find(
          (b) =>
            b.warehouseId === dto.warehouseId &&
            b.locationId === (dto.storageLocationId || null) &&
            b.batchNumber === dto.batchNumber
        );

        if (!batch) {
          throw new BatchNotFoundException(`Batch with number ${dto.batchNumber} not found in this location`);
        }

        await this.validator.validateBatchExists(batch.id, tx);
        await this.validator.validateBatchStatus(batch.id, 'ACTIVE', tx);

        const updatedBatch = await this.repository.incrementBatch(batch.id, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'STOCK_IN',
          productId: product.id,
          variantId: variant.id,
          batchId: updatedBatch.id,
          quantity: dto.quantity,
          toWarehouseId: dto.warehouseId,
          toLocationId: dto.storageLocationId || null,
          operatorName: dto.operatorName || 'Owner',
          referenceType: 'PURCHASE_RECEIVE',
          referenceId: dto.referenceId || null,
          notes: dto.notes || null,
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updatedBatch.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: dto.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('STOCK_IN', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        variantId: dto.variantId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'stock-in.completed',
        new StockInCompletedEvent(result.variantId, result.warehouseId, dto.batchNumber, result.quantity)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('STOCK_IN', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async stockOut(dto: StockOutDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const variant = await this.repository.findVariantById(dto.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${dto.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        await this.repository.findBusinessSettings(dto.userId, tx);
        await this.repository.findWarehouse(dto.warehouseId, tx);

        await this.validator.validateBusinessSettings(dto.userId, tx);
        await this.validator.validateWarehouse(dto.warehouseId, tx);
        await this.validator.validateVariantExists(dto.variantId, tx);

        const strategy = await this.strategyResolver.resolveForUser(dto.userId, tx);

        const allocations = await strategy.selectBatches(dto.variantId, dto.warehouseId, dto.quantity, tx);

        const allocatedQty = allocations.reduce((sum, a) => sum + a.quantity, 0);

        if (allocatedQty < dto.quantity) {
          throw new InsufficientStockException(
            `Insufficient stock to fulfill request. Requested: ${dto.quantity}, Allocated: ${allocatedQty}`
          );
        }

        for (const alloc of allocations) {
          await this.validator.validateBatchExists(alloc.batchId, tx);
          await this.validator.validateBatchStatus(alloc.batchId, 'ACTIVE', tx);
          await this.validator.validateSellableQuantity(alloc.batchId, alloc.quantity, tx);

          await this.repository.decrementBatch(alloc.batchId, alloc.quantity, tx);
        }

        await this.repository.syncProductQuantity(product.id, tx);

        const isSingleBatch = allocations.length === 1;
        const transaction = await this.repository.createInventoryTransaction({
          userId: dto.userId,
          type: 'STOCK_OUT',
          productId: product.id,
          variantId: variant.id,
          batchId: isSingleBatch ? allocations[0].batchId : null,
          quantity: dto.quantity,
          fromWarehouseId: dto.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceType: 'SALES_INVOICE',
          referenceId: dto.referenceId || null,
          notes: dto.notes || JSON.stringify(allocations),
        }, tx);

        return {
          transactionId: transaction.id,
          productId: product.id,
          variantId: variant.id,
          warehouseId: dto.warehouseId,
          quantity: dto.quantity,
          requestedQuantity: dto.quantity,
          allocatedQuantity: allocatedQty,
          allocations,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('STOCK_OUT', dto.userId, operationId, correlationId, latencyMs, 'SUCCESS', {
        variantId: dto.variantId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'stock-out.completed',
        new StockOutCompletedEvent(result.variantId, result.warehouseId, result.quantity)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('STOCK_OUT', dto.userId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async reserve(dto: ReservationDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(dto.batchId, tx);
        await this.validator.validateBatchStatus(dto.batchId, 'ACTIVE', tx);
        await this.validator.validateSellableQuantity(dto.batchId, dto.quantity, tx);

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        const updated = await this.repository.reserveBatch(dto.batchId, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'ADJUSTMENT',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: dto.quantity,
          toWarehouseId: updated.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceId: dto.referenceId || null,
          notes: dto.notes || 'RESERVATION',
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RESERVE', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId: dto.batchId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'reservation.created',
        new ReservationCreatedEvent(result.batchId!, result.quantity)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RESERVE', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async releaseReservation(dto: ReservationDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(dto.batchId, tx);
        await this.validator.validateReservation(dto.batchId, dto.quantity, tx);

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        const updated = await this.repository.releaseReservation(dto.batchId, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'ADJUSTMENT',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: dto.quantity,
          toWarehouseId: updated.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceId: dto.referenceId || null,
          notes: dto.notes || 'RESERVATION_RELEASE',
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RELEASE_RESERVATION', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId: dto.batchId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'reservation.released',
        new ReservationReleasedEvent(result.batchId!, result.quantity)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RELEASE_RESERVATION', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async transfer(dto: TransferDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await this.validator.validateTransfer(dto, tx);

        const variant = await this.repository.findVariantById(dto.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${dto.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        const batches = await this.repository.findVariantBatches(dto.variantId, tx);
        const sourceBatch = batches.find(
          (b) =>
            b.warehouseId === dto.fromWarehouseId &&
            b.locationId === (dto.fromLocationId || null) &&
            b.batchNumber === dto.batchNumber
        );
        const destinationBatch = batches.find(
          (b) =>
            b.warehouseId === dto.toWarehouseId &&
            b.locationId === (dto.toLocationId || null) &&
            b.batchNumber === dto.batchNumber
        );

        if (!sourceBatch) {
          throw new BatchNotFoundException(`Source batch ${dto.batchNumber} not found in this location`);
        }
        if (!destinationBatch) {
          throw new BatchNotFoundException(`Destination batch ${dto.batchNumber} not found in target location. Batch must exist.`);
        }

        await this.validator.validateBatchStatus(sourceBatch.id, 'ACTIVE', tx);
        await this.validator.validateSellableQuantity(sourceBatch.id, dto.quantity, tx);

        await this.validator.validateBatchStatus(destinationBatch.id, 'ACTIVE', tx);

        await this.repository.decrementBatch(sourceBatch.id, dto.quantity, tx);
        await this.repository.incrementBatch(destinationBatch.id, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: dto.userId,
          type: 'TRANSFER',
          productId: product.id,
          variantId: variant.id,
          batchId: sourceBatch.id,
          quantity: dto.quantity,
          fromWarehouseId: dto.fromWarehouseId,
          fromLocationId: dto.fromLocationId || null,
          toWarehouseId: dto.toWarehouseId,
          toLocationId: dto.toLocationId || null,
          operatorName: dto.operatorName || 'Owner',
          referenceType: 'TRANSFER_ORDER',
          referenceId: dto.referenceId || null,
          notes: dto.notes || `Stock transfer from WH ${dto.fromWarehouseId} to WH ${dto.toWarehouseId}`,
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: sourceBatch.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: dto.toWarehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('TRANSFER', dto.userId, operationId, correlationId, latencyMs, 'SUCCESS', {
        variantId: dto.variantId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'transfer.completed',
        new TransferCompletedEvent(
          result.variantId,
          dto.fromWarehouseId,
          dto.toWarehouseId,
          dto.batchNumber,
          result.quantity
        )
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('TRANSFER', dto.userId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async damage(dto: AdjustmentDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(dto.batchId, tx);
        await this.validator.validateStockAvailability(dto.batchId, dto.quantity, tx);
        await this.validator.validateDamage(dto.batchId, tx);

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        const updated = await this.repository.decrementBatch(dto.batchId, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'DAMAGE',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: dto.quantity,
          fromWarehouseId: updated.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceId: dto.referenceId || null,
          notes: dto.notes || 'MARKED AS DAMAGED',
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('DAMAGE', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId: dto.batchId,
        quantity: dto.quantity,
      });

      this.eventEmitter.emit(
        'batch.damaged',
        new BatchDamagedEvent(result.batchId!, result.quantity)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('DAMAGE', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async expiry(batchId: string): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(batchId, tx);
        await this.validator.validateExpiry(batchId, tx);

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        const updated = await this.repository.updateBatch(batchId, { status: 'EXPIRED' }, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'EXPIRED',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: updated.availableQuantity,
          fromWarehouseId: updated.warehouseId,
          operatorName: 'System',
          notes: 'BATCH EXPIRED',
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: updated.availableQuantity,
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('EXPIRY', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId,
      });

      this.eventEmitter.emit(
        'batch.expired',
        new BatchExpiredEvent(result.batchId!, result.completedAt)
      );

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('EXPIRY', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async adjust(dto: AdjustmentDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(dto.batchId, tx);

        if (dto.quantity < 0) {
          await this.validator.validateStockAvailability(dto.batchId, Math.abs(dto.quantity), tx);
        }

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        let updated;
        if (dto.quantity > 0) {
          updated = await this.repository.incrementBatch(dto.batchId, dto.quantity, tx);
        } else {
          updated = await this.repository.decrementBatch(dto.batchId, Math.abs(dto.quantity), tx);
        }

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'ADJUSTMENT',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: Math.abs(dto.quantity),
          toWarehouseId: updated.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceId: dto.referenceId || null,
          notes: dto.notes || `Stock adjustment: ${dto.quantity}`,
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: Math.abs(dto.quantity),
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('ADJUST', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId: dto.batchId,
        quantity: dto.quantity,
      });

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('ADJUST', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }

  async returnStock(dto: AdjustmentDto): Promise<StockMovementResult> {
    const startTime = performance.now();
    const operationId = randomUUID();
    const correlationId = dto.referenceId || operationId;
    let resolvedUserId = 'unknown';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const batch = await this.validator.validateBatchExists(dto.batchId, tx);

        const variant = await this.repository.findVariantById(batch.variantId, tx);
        if (!variant) {
          throw new BatchNotFoundException(`Variant with ID ${batch.variantId} not found`);
        }

        const product = await this.repository.findProductById(variant.productId, tx);
        if (!product) {
          throw new BatchNotFoundException(`Product with ID ${variant.productId} not found`);
        }

        resolvedUserId = product.userId;

        const updated = await this.repository.incrementBatch(dto.batchId, dto.quantity, tx);

        await this.repository.syncProductQuantity(product.id, tx);

        const transaction = await this.repository.createInventoryTransaction({
          userId: product.userId,
          type: 'RETURN',
          productId: product.id,
          variantId: variant.id,
          batchId: updated.id,
          quantity: dto.quantity,
          toWarehouseId: updated.warehouseId,
          operatorName: dto.operatorName || 'Owner',
          referenceId: dto.referenceId || null,
          notes: dto.notes || 'CUSTOMER STOCK RETURN',
        }, tx);

        return {
          transactionId: transaction.id,
          batchId: updated.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
          warehouseId: updated.warehouseId,
          completedAt: transaction.createdAt,
        };
      });

      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RETURN', resolvedUserId, operationId, correlationId, latencyMs, 'SUCCESS', {
        batchId: dto.batchId,
        quantity: dto.quantity,
      });

      return result;
    } catch (error) {
      const latencyMs = parseFloat((performance.now() - startTime).toFixed(2));
      this.logOperation('RETURN', resolvedUserId, operationId, correlationId, latencyMs, 'FAILURE', {
        error: error.message || error,
      });
      throw error;
    }
  }
}
