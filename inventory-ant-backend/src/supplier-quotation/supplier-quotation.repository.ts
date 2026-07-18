import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SupplierQuotation, SupplierQuotationItem, Prisma } from '@prisma/client';
import { SubmitQuotationDto } from './dto/submit-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Injectable()
export class SupplierQuotationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.supplierQuotation.count({
      where: { id, userId },
    });
    return count > 0;
  }

  async findByIdWithDetails(id: string, userId: string) {
    return this.prisma.supplierQuotation.findFirst({
      where: { id, userId },
      include: {
        rfq: true,
        supplier: true,
        items: {
          include: {
            variant: true,
          },
        },
      },
    });
  }

  async findActiveQuotationForSupplier(rfqId: string, supplierId: string, userId: string): Promise<SupplierQuotation | null> {
    return this.prisma.supplierQuotation.findFirst({
      where: {
        rfqId,
        supplierId,
        userId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED'] },
      },
    });
  }

  async submit(userId: string, data: SubmitQuotationDto): Promise<SupplierQuotation & { items: SupplierQuotationItem[] }> {
    return this.prisma.supplierQuotation.create({
      data: {
        userId,
        rfqId: data.rfqId,
        supplierId: data.supplierId,
        status: 'SUBMITTED',
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            deliveryLeadTime: item.deliveryLeadTime,
            remarks: item.remarks ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateQuotationDto): Promise<SupplierQuotation & { items: SupplierQuotationItem[] }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.supplierQuotationItem.deleteMany({
        where: { quotationId: id },
      });

      // 2. Insert new items
      await tx.supplierQuotationItem.createMany({
        data: data.items.map((item) => ({
          quotationId: id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          deliveryLeadTime: item.deliveryLeadTime,
          remarks: item.remarks ?? null,
        })),
      });

      // 3. Return full object
      const quotation = await tx.supplierQuotation.findUnique({
        where: { id },
      });
      const items = await tx.supplierQuotationItem.findMany({
        where: { quotationId: id },
      });

      if (!quotation) {
        throw new Error('Quotation not found after update');
      }

      return {
        ...quotation,
        items,
      };
    });
  }

  async withdraw(id: string, userId: string): Promise<SupplierQuotation> {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplierQuotation.findFirst({
        where: { id, userId },
      });
      if (!quotation) {
        throw new Error(`Quotation not found`);
      }

      await tx.supplierQuotationItem.deleteMany({
        where: { quotationId: id },
      });

      return tx.supplierQuotation.delete({
        where: { id },
      });
    });
  }

  async updateStatus(id: string, userId: string, status: string): Promise<SupplierQuotation> {
    return this.prisma.supplierQuotation.update({
      where: { id, userId },
      data: { status },
    });
  }

  async rejectOtherQuotations(rfqId: string, selectedQuotationId: string, userId: string) {
    return this.prisma.supplierQuotation.updateMany({
      where: {
        rfqId,
        id: { not: selectedQuotationId },
        userId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async updateRFQStatus(rfqId: string, userId: string, status: string) {
    return this.prisma.requestForQuotation.update({
      where: { id: rfqId, userId },
      data: { status },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string; rfqId?: string },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.SupplierQuotationWhereInput = {
      userId,
      ...(params.rfqId ? { rfqId: params.rfqId } : {}),
      ...(params.search
        ? {
            OR: [
              {
                supplier: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                rfq: {
                  rfqNumber: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplierQuotation.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          rfq: true,
          supplier: true,
          items: {
            include: {
              variant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierQuotation.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }
}
