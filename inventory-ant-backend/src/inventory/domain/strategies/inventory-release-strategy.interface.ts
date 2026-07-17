import { Prisma } from '@prisma/client';

export interface BatchAllocation {
  batchId: string;
  quantity: number;
}

export interface InventoryReleaseStrategy {
  selectBatches(
    variantId: string,
    warehouseId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BatchAllocation[]>;
}
