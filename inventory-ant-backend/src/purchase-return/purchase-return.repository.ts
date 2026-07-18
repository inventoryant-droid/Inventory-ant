import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseReturn, PurchaseReturnItem, Prisma } from '@prisma/client';
import { CreatePurchaseReturnDto } from './dto/create-return.dto';

@Injectable()
export class PurchaseReturnRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.purchaseReturn.count({
      where: { id, userId },
    });
    return count > 0;
  }

  async findByIdWithDetails(id: string, userId: string) {
    return this.prisma.purchaseReturn.findFirst({
      where: { id, userId },
      include: {
        purchaseOrder: true,
        goodsReceipt: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            variant: true,
            batch: true,
            warehouse: true,
          },
        },
      },
    });
  }

  async generatePRTNNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);

    const count = await this.prisma.purchaseReturn.count({
      where: {
        userId,
        createdAt: {
          gte: startOfYear,
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `PRTN-${year}-${seq}`;
  }

  async getReturnedQuantitiesForGRN(goodsReceiptId: string, userId: string): Promise<Record<string, number>> {
    const completedReturns = await this.prisma.purchaseReturn.findMany({
      where: {
        goodsReceiptId,
        userId,
        status: 'COMPLETED',
      },
      include: {
        items: true,
      },
    });

    const totals: Record<string, number> = {};
    for (const ret of completedReturns) {
      for (const item of ret.items) {
        const key = `${item.variantId}_${item.batchId}`;
        totals[key] = (totals[key] || 0) + item.quantity;
      }
    }
    return totals;
  }

  async create(
    userId: string,
    createdBy: string,
    returnNumber: string,
    dto: CreatePurchaseReturnDto,
  ): Promise<PurchaseReturn & { items: PurchaseReturnItem[] }> {
    return this.prisma.purchaseReturn.create({
      data: {
        returnNumber,
        userId,
        purchaseOrderId: dto.purchaseOrderId,
        goodsReceiptId: dto.goodsReceiptId,
        notes: dto.notes ?? null,
        createdBy,
        status: 'DRAFT',
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            batchId: item.batchId,
            quantity: item.quantity,
            reason: item.reason,
            remarks: item.remarks ?? null,
            warehouseId: item.warehouseId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<PurchaseReturn> {
    return this.prisma.purchaseReturn.update({
      where: { id, userId },
      data: { status },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.PurchaseReturnWhereInput = {
      userId,
      ...(params.search
        ? {
            OR: [
              { returnNumber: { contains: params.search, mode: 'insensitive' } },
              { notes: { contains: params.search, mode: 'insensitive' } },
              {
                purchaseOrder: {
                  poNumber: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          purchaseOrder: true,
          goodsReceipt: true,
          items: {
            include: {
              variant: true,
              batch: true,
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseReturn.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async findWarehouse(warehouseId: string, userId: string) {
    return this.prisma.warehouse.findFirst({
      where: { id: warehouseId, userId, isActive: true },
    });
  }

  async findVariant(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
  }

  async findBatch(batchId: string) {
    return this.prisma.productBatch.findUnique({
      where: { id: batchId },
    });
  }
}
