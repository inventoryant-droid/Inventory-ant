import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseOrder, PurchaseOrderItem, PurchaseStatus, Prisma } from '@prisma/client';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWarehouse(id: string, userId: string) {
    return this.prisma.warehouse.findFirst({
      where: { id, userId, isActive: true },
    });
  }

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.purchaseOrder.count({
      where: { id, userId },
    });
    return count > 0;
  }

  async findByIdWithDetails(id: string, userId: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: {
        supplier: true,
        rfq: true,
        quotation: true,
        warehouse: true,
        items: {
          include: {
            variant: true,
          },
        },
      },
    });
  }

  async generatePONumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);

    const count = await this.prisma.purchaseOrder.count({
      where: {
        userId,
        createdAt: {
          gte: startOfYear,
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `PO-${year}-${seq}`;
  }

  async hasExistingPOForQuotation(quotationId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.purchaseOrder.count({
      where: { quotationId, userId },
    });
    return count > 0;
  }

  async create(
    userId: string,
    createdBy: string,
    poNumber: string,
    dto: CreatePurchaseOrderDto,
    quotation: any,
    calculations: { subtotal: number; discount: number; tax: number; total: number },
  ): Promise<PurchaseOrder & { items: PurchaseOrderItem[] }> {
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        userId,
        supplierId: quotation.supplierId,
        rfqId: quotation.rfqId,
        quotationId: quotation.id,
        warehouseId: dto.warehouseId,
        orderDate: new Date(dto.orderDate),
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        notes: dto.notes ?? null,
        currency: 'USD',
        subtotal: calculations.subtotal,
        discount: calculations.discount,
        tax: calculations.tax,
        total: calculations.total,
        paymentTerms: dto.paymentTerms ?? null,
        deliveryTerms: dto.deliveryTerms ?? null,
        shippingAddress: dto.shippingAddress ?? null,
        billingAddress: dto.billingAddress ?? null,
        createdBy,
        status: PurchaseStatus.DRAFT,
        items: {
          create: quotation.items.map((item: any) => {
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = item.quantity * item.discount;
            const itemTax = (itemSubtotal - itemDiscount) * (item.taxRate / 100);
            const itemTotal = itemSubtotal - itemDiscount + itemTax;
            return {
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.unitPrice,
              discount: item.discount,
              tax: item.taxRate,
              total: itemTotal,
              deliveryLeadTime: item.deliveryLeadTime,
              remarks: item.remarks ?? null,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id, userId },
      data: {
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.orderDate ? { orderDate: new Date(dto.orderDate) } : {}),
        expectedDeliveryDate: dto.expectedDeliveryDate !== undefined 
          ? (dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null)
          : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress : undefined,
        billingAddress: dto.billingAddress !== undefined ? dto.billingAddress : undefined,
        paymentTerms: dto.paymentTerms !== undefined ? dto.paymentTerms : undefined,
        deliveryTerms: dto.deliveryTerms !== undefined ? dto.deliveryTerms : undefined,
      },
    });
  }

  async updateStatus(id: string, userId: string, status: PurchaseStatus): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id, userId },
      data: { status },
    });
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string; status?: PurchaseStatus },
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: Prisma.PurchaseOrderWhereInput = {
      userId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { poNumber: { contains: params.search, mode: 'insensitive' } },
              { notes: { contains: params.search, mode: 'insensitive' } },
              {
                supplier: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              variant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }
}
