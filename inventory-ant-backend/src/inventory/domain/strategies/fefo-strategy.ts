import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryReleaseStrategy, BatchAllocation } from './inventory-release-strategy.interface';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';

@Injectable()
export class FefoStrategy implements InventoryReleaseStrategy {
  constructor(private readonly repository: InventoryRepository) {}

  async selectBatches(
    variantId: string,
    warehouseId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BatchAllocation[]> {
    const batches = await this.repository.findSellableBatches(variantId, warehouseId, tx);

    const candidates = batches
      .map(b => ({
        batch: b,
        sellable: b.availableQuantity - b.reservedQuantity,
      }))
      .filter(c => c.sellable > 0);

    // Sort by expiryDate ASC (FEFO), Null expiry comes last
    candidates.sort((a, b) => {
      const expA = a.batch.expiryDate;
      const expB = b.batch.expiryDate;

      if (expA === null && expB === null) {
        return a.batch.createdAt.getTime() - b.batch.createdAt.getTime();
      }
      if (expA === null) return 1; // null comes last
      if (expB === null) return -1;

      return expA.getTime() - expB.getTime();
    });

    const allocations: BatchAllocation[] = [];
    let remaining = quantity;

    for (const c of candidates) {
      if (remaining <= 0) break;

      const toAllocate = Math.min(remaining, c.sellable);
      allocations.push({
        batchId: c.batch.id,
        quantity: toAllocate,
      });
      remaining -= toAllocate;
    }

    return allocations;
  }
}
