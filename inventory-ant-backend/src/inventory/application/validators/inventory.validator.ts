import { Injectable } from '@nestjs/common';
import { Prisma, ProductBatch } from '@prisma/client';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';
import { TransferDto } from '../dto/transfer.dto';
import { 
  BatchNotFoundException, 
  InsufficientStockException, 
  InvalidWarehouseException, 
  InvalidReservationException 
} from '../exceptions/inventory.exceptions';

@Injectable()
export class InventoryValidator {
  constructor(private readonly repository: InventoryRepository) {}

  async validateBatchExists(batchId: string, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    const batch = await this.repository.findBatchById(batchId, tx);
    if (!batch) {
      throw new BatchNotFoundException(`Batch with ID ${batchId} not found`);
    }
    return batch;
  }

  async validateVariantExists(variantId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const variant = await this.repository.findVariantById(variantId, tx);
    if (!variant) {
      throw new BatchNotFoundException(`Product variant with ID ${variantId} not found`);
    }
    return variant;
  }

  async validateWarehouse(warehouseId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const warehouse = await this.repository.findWarehouse(warehouseId, tx);
    if (!warehouse) {
      throw new InvalidWarehouseException(`Warehouse with ID ${warehouseId} not found`);
    }
    if (!warehouse.isActive) {
      throw new InvalidWarehouseException(`Warehouse with ID ${warehouseId} is inactive`);
    }
    return warehouse;
  }

  async validateStorageLocation(locationId: string, warehouseId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const location = await this.repository.findStorageLocation(locationId, tx);
    if (!location) {
      throw new BatchNotFoundException(`Storage location with ID ${locationId} not found`);
    }
    if (location.warehouseId !== warehouseId) {
      throw new InvalidWarehouseException(`Storage location ${locationId} does not belong to warehouse ${warehouseId}`);
    }
    return location;
  }

  async validateBusinessSettings(userId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const settings = await this.repository.findBusinessSettings(userId, tx);
    if (!settings) {
      throw new InvalidWarehouseException(`Business settings for user ${userId} not found`);
    }
    return settings;
  }

  async validateStockAvailability(batchId: string, requested: number, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    if (batch.availableQuantity < requested) {
      throw new InsufficientStockException(
        `Insufficient stock in batch ${batchId}. Available: ${batch.availableQuantity}, Requested: ${requested}`
      );
    }
  }

  async validateSellableQuantity(batchId: string, requested: number, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    
    // Check if expired
    if (batch.status === 'EXPIRED' || (batch.expiryDate && batch.expiryDate <= new Date())) {
      throw new InsufficientStockException(`Cannot allocate from expired batch ${batchId}`);
    }

    // Check if damaged/quarantined/rejected
    if (batch.status === 'REJECTED' || batch.status === 'QUARANTINED') {
      throw new InsufficientStockException(`Cannot allocate from damaged/quarantined batch ${batchId}`);
    }

    // Check status is active
    if (batch.status !== 'ACTIVE') {
      throw new InsufficientStockException(`Batch ${batchId} status is ${batch.status}, cannot allocate`);
    }

    const sellable = batch.availableQuantity - batch.reservedQuantity;
    if (sellable < requested) {
      throw new InsufficientStockException(
        `Insufficient sellable stock in batch ${batchId}. Sellable: ${sellable}, Requested: ${requested}`
      );
    }
  }

  async validateReservation(batchId: string, requestedRelease: number, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    if (batch.reservedQuantity < requestedRelease) {
      throw new InvalidReservationException(
        `Cannot release reservation from batch ${batchId}. Reserved: ${batch.reservedQuantity}, Requested: ${requestedRelease}`
      );
    }
  }

  async validateTransfer(dto: TransferDto, tx?: Prisma.TransactionClient): Promise<void> {
    if (dto.fromWarehouseId === dto.toWarehouseId && dto.fromLocationId === dto.toLocationId) {
      throw new InvalidWarehouseException('Source and destination warehouse & storage locations cannot be identical');
    }

    // Validate warehouses
    await this.validateWarehouse(dto.fromWarehouseId, tx);
    await this.validateWarehouse(dto.toWarehouseId, tx);

    // Validate locations if provided
    if (dto.fromLocationId) {
      await this.validateStorageLocation(dto.fromLocationId, dto.fromWarehouseId, tx);
    }
    if (dto.toLocationId) {
      await this.validateStorageLocation(dto.toLocationId, dto.toWarehouseId, tx);
    }

    // Validate variant exists
    await this.validateVariantExists(dto.variantId, tx);
  }

  async validateExpiry(batchId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    if (batch.expiryDate && batch.expiryDate <= new Date()) {
      throw new InsufficientStockException(`Batch ${batchId} is already expired`);
    }
  }

  async validateDamage(batchId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    if (batch.status === 'REJECTED' || batch.status === 'QUARANTINED') {
      throw new InsufficientStockException(`Batch ${batchId} is already marked as damaged/quarantined`);
    }
  }

  async validateBatchStatus(batchId: string, expectedStatus: string, tx?: Prisma.TransactionClient): Promise<void> {
    const batch = await this.validateBatchExists(batchId, tx);
    if (batch.status !== expectedStatus) {
      throw new InsufficientStockException(`Batch ${batchId} status is ${batch.status}, expected ${expectedStatus}`);
    }
  }
}
