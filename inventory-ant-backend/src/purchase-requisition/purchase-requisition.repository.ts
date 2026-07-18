import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseRequisition, PurchaseRequisitionItem, Prisma } from '@prisma/client';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';

@Injectable()
export class PurchaseRequisitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateRequisitionDto): Promise<PurchaseRequisition & { items: PurchaseRequisitionItem[] }> {
    return this.prisma.purchaseRequisition.create({
      data: {
        userId,
        requestorId: data.requestorId,
        notes: data.notes ?? null,
        status: 'DRAFT',
        isDeleted: false,
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            estimatedCost: item.estimatedCost,
            notes: item.notes ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateRequisitionDto): Promise<PurchaseRequisition & { items: PurchaseRequisitionItem[] }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update requisition fields
      const updatedRequisition = await tx.purchaseRequisition.update({
        where: { id, userId },
        data: {
          notes: data.notes,
        },
      });

      // 2. If items list is updated, delete old and write new
      if (data.items) {
        await tx.purchaseRequisitionItem.deleteMany({
          where: { requisitionId: id },
        });

        await tx.purchaseRequisitionItem.createMany({
          data: data.items.map((item) => ({
            requisitionId: id,
            variantId: item.variantId,
            quantity: item.quantity,
            estimatedCost: item.estimatedCost,
            notes: item.notes ?? null,
          })),
        });
      }

      // 3. Return full updated object
      const items = await tx.purchaseRequisitionItem.findMany({
        where: { requisitionId: id },
      });

      return {
        ...updatedRequisition,
        items,
      };
    });
  }

  async findByIdWithItems(id: string, userId: string) {
    return this.prisma.purchaseRequisition.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });
  }

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.purchaseRequisition.count({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  async findActiveVariants(variantIds: string[], tenantEmail: string) {
    return this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        product: {
          userId: tenantEmail,
        },
      },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string; status?: string },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.PurchaseRequisitionWhereInput = {
      userId,
      isDeleted: false,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { notes: { contains: params.search, mode: 'insensitive' } },
              {
                items: {
                  some: {
                    variant: {
                      name: { contains: params.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequisition.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          items: {
            include: {
              variant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseRequisition.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async updateStatus(id: string, userId: string, status: string): Promise<PurchaseRequisition> {
    return this.prisma.purchaseRequisition.update({
      where: { id, userId },
      data: { status },
    });
  }

  async softDelete(id: string, userId: string): Promise<PurchaseRequisition> {
    return this.prisma.purchaseRequisition.update({
      where: { id, userId },
      data: { isDeleted: true },
    });
  }
}
