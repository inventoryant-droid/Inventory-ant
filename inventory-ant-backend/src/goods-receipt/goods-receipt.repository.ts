import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseReceive, PurchaseReceiveItem, Prisma } from '@prisma/client';
import { CreateGoodsReceiptDto } from './dto/create-grn.dto';

@Injectable()
export class GoodsReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.purchaseReceive.count({
      where: { id, userId },
    });
    return count > 0;
  }

  async findByIdWithDetails(id: string, userId: string) {
    return this.prisma.purchaseReceive.findFirst({
      where: { id, userId },
      include: {
        purchaseOrder: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            variant: true,
            warehouse: true,
          },
        },
      },
    });
  }

  async generateGRNNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);

    const count = await this.prisma.purchaseReceive.count({
      where: {
        userId,
        createdAt: {
          gte: startOfYear,
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `GRN-${year}-${seq}`;
  }

  async getReceivedQuantitiesForPO(purchaseOrderId: string, userId: string): Promise<Record<string, number>> {
    const completedGrns = await this.prisma.purchaseReceive.findMany({
      where: {
        purchaseOrderId,
        userId,
        status: 'COMPLETED',
      },
      include: {
        items: true,
      },
    });

    const totals: Record<string, number> = {};
    for (const grn of completedGrns) {
      for (const item of grn.items) {
        totals[item.variantId] = (totals[item.variantId] || 0) + item.quantityReceived;
      }
    }
    return totals;
  }

  async create(
    userId: string,
    receivedBy: string,
    grnNumber: string,
    dto: CreateGoodsReceiptDto,
  ): Promise<PurchaseReceive & { items: PurchaseReceiveItem[] }> {
    return this.prisma.purchaseReceive.create({
      data: {
        grnNumber,
        userId,
        purchaseOrderId: dto.purchaseOrderId,
        receiveDate: new Date(dto.receiveDate),
        receivedBy,
        notes: dto.notes ?? null,
        status: 'DRAFT',
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantityReceived: item.quantityReceived,
            batchNumber: item.batchNumber,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            purchasePrice: item.purchasePrice,
            mrp: item.mrp,
            warehouseId: item.warehouseId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<PurchaseReceive> {
    return this.prisma.purchaseReceive.update({
      where: { id, userId },
      data: { status },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.PurchaseReceiveWhereInput = {
      userId,
      ...(params.search
        ? {
            OR: [
              { grnNumber: { contains: params.search, mode: 'insensitive' } },
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
      this.prisma.purchaseReceive.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          purchaseOrder: true,
          items: {
            include: {
              variant: true,
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseReceive.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async updatePOStatus(poId: string, userId: string, status: any) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId, userId },
      data: { status },
    });
  }

  // To check if a warehouse is active and belongs to tenant
  async findWarehouse(warehouseId: string, userId: string) {
    return this.prisma.warehouse.findFirst({
      where: { id: warehouseId, userId, isActive: true },
    });
  }

  // To check if variant exists
  async findVariant(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
  }
}
