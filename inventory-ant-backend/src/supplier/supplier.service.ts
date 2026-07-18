import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupplierRepository } from './supplier.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  async create(userId: string, dto: CreateSupplierDto): Promise<Supplier> {
    // 1. Check duplicate name per tenant
    const nameExists = await this.repository.existsByName(dto.name, userId);
    if (nameExists) {
      throw new ConflictException(`Supplier with name "${dto.name}" already exists`);
    }

    // 2. Check duplicate GST per tenant (if provided)
    if (dto.gstNumber) {
      const gstExists = await this.repository.existsByGST(dto.gstNumber, userId);
      if (gstExists) {
        throw new ConflictException(`Supplier with GST number "${dto.gstNumber}" already exists`);
      }
    }

    return this.repository.create(userId, dto);
  }

  async update(id: string, userId: string, dto: UpdateSupplierDto): Promise<Supplier> {
    // 1. Verify existence and tenant ownership
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // 2. Check duplicate name if updated
    if (dto.name) {
      const nameExists = await this.repository.existsByName(dto.name, userId, id);
      if (nameExists) {
        throw new ConflictException(`Supplier with name "${dto.name}" already exists`);
      }
    }

    // 3. Check duplicate GST if updated
    if (dto.gstNumber) {
      const gstExists = await this.repository.existsByGST(dto.gstNumber, userId, id);
      if (gstExists) {
        throw new ConflictException(`Supplier with GST number "${dto.gstNumber}" already exists`);
      }
    }

    return this.repository.update(id, userId, dto);
  }

  async findById(id: string, userId: string): Promise<Supplier> {
    const supplier = await this.repository.findById(id, userId);
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async list(
    userId: string,
    params: { page: number; pageSize: number; search?: string; active?: boolean },
  ): Promise<{ items: Supplier[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(100, params.pageSize));
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repository.list(userId, {
      skip,
      take: pageSize,
      search: params.search,
      active: params.active,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async activate(id: string, userId: string): Promise<Supplier> {
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return this.repository.setActiveStatus(id, userId, true);
  }

  async deactivate(id: string, userId: string): Promise<Supplier> {
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return this.repository.setActiveStatus(id, userId, false);
  }

  async softDelete(id: string, userId: string): Promise<Supplier> {
    const exists = await this.repository.existsById(id, userId);
    if (!exists) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return this.repository.softDelete(id, userId);
  }
}
