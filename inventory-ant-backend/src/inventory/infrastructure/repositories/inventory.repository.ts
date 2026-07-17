import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { Prisma, ProductBatch, BusinessSettings } from '@prisma/client';
import { 
  BatchNotFoundException, 
  InsufficientStockException, 
  InvalidReservationException 
} from '../../application/exceptions/inventory.exceptions';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: Prisma.TransactionClient) {
    return tx || this.prisma;
  }

  async findBatchById(id: string, tx?: Prisma.TransactionClient): Promise<ProductBatch | null> {
    return this.getClient(tx).productBatch.findUnique({ where: { id } });
  }

  async findVariantById(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        sku: true,
        barcode: true,
        name: true,
        defaultCostPrice: true,
        defaultSellingPrice: true,
        uomId: true,
      },
    });
  }

  async findProductById(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).product.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        productId: true,
        hsnSac: true,
        name: true,
        details: true,
        mrp: true,
        costPrice: true,
        paket: true,
      },
    });
  }

  async findWarehouse(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).warehouse.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        code: true,
        type: true,
        temperature: true,
        capacity: true,
        isActive: true,
      },
    });
  }

  async findStorageLocation(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).storageLocation.findUnique({
      where: { id },
      select: {
        id: true,
        warehouseId: true,
        zoneId: true,
        name: true,
        type: true,
        parentId: true,
      },
    });
  }

  async findBusinessSettings(userId: string, tx?: Prisma.TransactionClient): Promise<BusinessSettings | null> {
    return this.getClient(tx).businessSettings.findUnique({ where: { userId } });
  }

  async findSellableBatches(variantId: string, warehouseId: string, tx?: Prisma.TransactionClient): Promise<ProductBatch[]> {
    const client = this.getClient(tx);
    return client.productBatch.findMany({
      where: {
        variantId,
        warehouseId,
        status: 'ACTIVE',
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateBatch(id: string, data: Prisma.ProductBatchUpdateInput, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    return this.getClient(tx).productBatch.update({
      where: { id },
      data,
    });
  }

  async incrementBatch(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    const client = this.getClient(tx);
    
    if (tx) {
      await tx.$executeRaw`SELECT id FROM "ProductBatch" WHERE id = ${id} FOR UPDATE`;
    }

    return client.productBatch.update({
      where: { id },
      data: {
        availableQuantity: { increment: amount },
      },
    });
  }

  async decrementBatch(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    const client = this.getClient(tx);

    if (tx) {
      await tx.$executeRaw`SELECT id FROM "ProductBatch" WHERE id = ${id} FOR UPDATE`;
    }

    // Atomic verify-and-update check
    const updateResult = await client.productBatch.updateMany({
      where: {
        id,
        availableQuantity: { gte: amount },
      },
      data: {
        availableQuantity: { decrement: amount },
      },
    });

    if (updateResult.count === 0) {
      throw new InsufficientStockException('Insufficient available stock in this batch');
    }

    const updated = await client.productBatch.findUnique({ where: { id } });
    if (!updated) {
      throw new BatchNotFoundException('Batch not found');
    }
    return updated;
  }

  async reserveBatch(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    const client = this.getClient(tx);

    if (tx) {
      await tx.$executeRaw`SELECT id FROM "ProductBatch" WHERE id = ${id} FOR UPDATE`;
    }

    const batch = await client.productBatch.findUnique({
      where: { id },
      select: { id: true, availableQuantity: true, reservedQuantity: true },
    });

    if (!batch) {
      throw new BatchNotFoundException('Batch not found');
    }

    const sellable = batch.availableQuantity - batch.reservedQuantity;
    if (sellable < amount) {
      throw new InsufficientStockException('Insufficient sellable stock to reserve');
    }

    return client.productBatch.update({
      where: { id },
      data: {
        reservedQuantity: { increment: amount },
      },
    });
  }

  async releaseReservation(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<ProductBatch> {
    const client = this.getClient(tx);

    if (tx) {
      await tx.$executeRaw`SELECT id FROM "ProductBatch" WHERE id = ${id} FOR UPDATE`;
    }

    const batch = await client.productBatch.findUnique({
      where: { id },
      select: { id: true, reservedQuantity: true },
    });

    if (!batch) {
      throw new BatchNotFoundException('Batch not found');
    }

    if (batch.reservedQuantity < amount) {
      throw new InvalidReservationException('Cannot release more than reserved quantity');
    }

    return client.productBatch.update({
      where: { id },
      data: {
        reservedQuantity: { decrement: amount },
      },
    });
  }

  async syncProductQuantity(productId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = this.getClient(tx);

    const result = await client.productBatch.aggregate({
      where: {
        variant: {
          productId,
        },
      },
      _sum: {
        availableQuantity: true,
      },
    });

    const totalQty = result._sum.availableQuantity || 0;

    return client.product.update({
      where: { id: productId },
      data: {
        quantity: totalQty.toString(),
      },
    });
  }

  async createInventoryTransaction(
    data: Prisma.InventoryTransactionUncheckedCreateInput, 
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    return this.getClient(tx).inventoryTransaction.create({ data });
  }

  async findTransaction(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).inventoryTransaction.findUnique({ where: { id } });
  }

  async findVariantBatches(variantId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).productBatch.findMany({
      where: { variantId },
    });
  }
}
