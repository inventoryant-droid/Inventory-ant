import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Supplier, Prisma } from '@prisma/client';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        userId,
        name: data.name,
        contactName: data.contactName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        gstNumber: data.gstNumber ?? null,
        creditLimit: data.creditLimit ?? null,
        isActive: true,
        isDeleted: false,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id, userId },
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gstNumber: data.gstNumber,
        creditLimit: data.creditLimit,
      },
    });
  }

  async findById(id: string, userId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });
  }

  async findActiveById(id: string, userId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: {
        id,
        userId,
        isActive: true,
        isDeleted: false,
      },
    });
  }

  async existsById(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  async existsByName(name: string, userId: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: {
        userId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async existsByGST(gstNumber: string, userId: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: {
        userId,
        gstNumber: {
          equals: gstNumber,
          mode: 'insensitive',
        },
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async list(
    userId: string,
    params: { skip: number; take: number; search?: string; active?: boolean },
  ): Promise<{ items: Supplier[]; total: number }> {
    const whereClause: Prisma.SupplierWhereInput = {
      userId,
      isDeleted: false,
      ...(params.active !== undefined ? { isActive: params.active } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { contactName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
              { address: { contains: params.search, mode: 'insensitive' } },
              { gstNumber: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async softDelete(id: string, userId: string): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id, userId },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  }

  async setActiveStatus(id: string, userId: string, isActive: boolean): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id, userId },
      data: {
        isActive,
      },
    });
  }
}
