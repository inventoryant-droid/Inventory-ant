import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestForQuotation, RFQItem, RFQSupplier, Prisma } from '@prisma/client';
import { UpdateRFQDto } from './dto/update-rfq.dto';

@Injectable()
export class RequestForQuotationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateRFQNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    
    const count = await this.prisma.requestForQuotation.count({
      where: {
        userId,
        createdAt: {
          gte: startOfYear,
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `RFQ-${year}-${seq}`;
  }

  async checkRequisitionHasActiveRFQ(requisitionId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.requestForQuotation.count({
      where: {
        requisitionId,
        userId,
        status: { not: 'CLOSED' },
        isDeleted: false,
      },
    });
    return count > 0;
  }

  async createFromRequisition(
    userId: string,
    createdBy: string,
    rfqNumber: string,
    expiryDate: Date,
    requisition: { id: string; items: any[] },
  ): Promise<RequestForQuotation & { items: RFQItem[] }> {
    return this.prisma.requestForQuotation.create({
      data: {
        rfqNumber,
        userId,
        requisitionId: requisition.id,
        expiryDate,
        createdBy,
        status: 'DRAFT',
        isDeleted: false,
        items: {
          create: requisition.items.map((item) => ({
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

  async update(id: string, userId: string, data: UpdateRFQDto): Promise<RequestForQuotation> {
    return this.prisma.requestForQuotation.update({
      where: { id, userId },
      data: {
        ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate) } : {}),
      },
    });
  }

  async findByIdWithDetails(id: string, userId: string) {
    return this.prisma.requestForQuotation.findFirst({
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
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.requestForQuotation.count({
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

  async addSupplierToRFQ(rfqId: string, supplierId: string): Promise<RFQSupplier> {
    return this.prisma.rFQSupplier.create({
      data: {
        rfqId,
        supplierId,
      },
    });
  }

  async removeSupplierFromRFQ(rfqId: string, supplierId: string): Promise<RFQSupplier> {
    const rfqSupplier = await this.prisma.rFQSupplier.findFirst({
      where: { rfqId, supplierId },
    });
    if (!rfqSupplier) {
      throw new Error(`Supplier connection not found`);
    }
    return this.prisma.rFQSupplier.delete({
      where: { id: rfqSupplier.id },
    });
  }

  async getSuppliersForRFQ(rfqId: string, userId: string) {
    return this.prisma.rFQSupplier.findMany({
      where: {
        rfqId,
        rfq: {
          userId,
          isDeleted: false,
        },
      },
      include: {
        supplier: true,
      },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string; status?: string },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.RequestForQuotationWhereInput = {
      userId,
      isDeleted: false,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { rfqNumber: { contains: params.search, mode: 'insensitive' } },
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
      this.prisma.requestForQuotation.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          items: {
            include: {
              variant: true,
            },
          },
          suppliers: {
            include: {
              supplier: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.requestForQuotation.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async updateStatus(id: string, userId: string, status: string): Promise<RequestForQuotation> {
    return this.prisma.requestForQuotation.update({
      where: { id, userId },
      data: { status },
    });
  }

  async softDelete(id: string, userId: string): Promise<RequestForQuotation> {
    return this.prisma.requestForQuotation.update({
      where: { id, userId },
      data: { isDeleted: true },
    });
  }
}
