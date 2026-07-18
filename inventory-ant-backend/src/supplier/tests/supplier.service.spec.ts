import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier.service';
import { SupplierRepository } from '../supplier.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';

describe('SupplierService', () => {
  let service: SupplierService;
  let repository: jest.Mocked<SupplierRepository>;

  const userId = 'tenant-1';
  const supplierId = 'sup-1';

  const mockSupplier = {
    id: supplierId,
    userId,
    name: 'Acme Corp',
    contactName: 'John Doe',
    email: 'john@acme.com',
    phone: '+1234567890',
    address: '123 Acme St',
    gstNumber: '29ABCDE1234F1Z5',
    creditLimit: 50000,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findActiveById: jest.fn(),
      existsById: jest.fn(),
      existsByName: jest.fn(),
      existsByGST: jest.fn(),
      list: jest.fn(),
      softDelete: jest.fn(),
      setActiveStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: SupplierRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    repository = module.get(SupplierRepository);
  });

  describe('create', () => {
    const createDto: CreateSupplierDto = {
      name: 'Acme Corp',
      contactName: 'John Doe',
      email: 'john@acme.com',
      phone: '+1234567890',
      address: '123 Acme St',
      gstNumber: '29ABCDE1234F1Z5',
      creditLimit: 50000,
    };

    it('should successfully create a supplier if name and GST are unique', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.existsByGST.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockSupplier);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockSupplier);
      expect(repository.existsByName).toHaveBeenCalledWith('Acme Corp', userId);
      expect(repository.existsByGST).toHaveBeenCalledWith('29ABCDE1234F1Z5', userId);
      expect(repository.create).toHaveBeenCalledWith(userId, createDto);
    });

    it('should throw ConflictException if name already exists for the tenant', async () => {
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create(userId, createDto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if GST already exists for the tenant', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.existsByGST.mockResolvedValue(true);

      await expect(service.create(userId, createDto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateSupplierDto = {
      name: 'Acme Solutions',
      creditLimit: 60000,
    };

    it('should successfully update supplier if ID exists and new details do not conflict', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByName.mockResolvedValue(false);
      repository.update.mockResolvedValue({
        ...mockSupplier,
        name: 'Acme Solutions',
        creditLimit: 60000,
      });

      const result = await service.update(supplierId, userId, updateDto);

      expect(result.name).toBe('Acme Solutions');
      expect(result.creditLimit).toBe(60000);
      expect(repository.existsById).toHaveBeenCalledWith(supplierId, userId);
      expect(repository.existsByName).toHaveBeenCalledWith('Acme Solutions', userId, supplierId);
      expect(repository.update).toHaveBeenCalledWith(supplierId, userId, updateDto);
    });

    it('should throw NotFoundException if supplier does not exist', async () => {
      repository.existsById.mockResolvedValue(false);

      await expect(service.update(supplierId, userId, updateDto)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if updated name conflicts with another supplier', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByName.mockResolvedValue(true);

      await expect(service.update(supplierId, userId, updateDto)).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return supplier if found and not deleted', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      const result = await service.findById(supplierId, userId);

      expect(result).toEqual(mockSupplier);
      expect(repository.findById).toHaveBeenCalledWith(supplierId, userId);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(supplierId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('should return paginated items with correct metadata', async () => {
      const mockList = [mockSupplier];
      repository.list.mockResolvedValue({ items: mockList, total: 15 });

      const result = await service.list(userId, { page: 2, pageSize: 5, search: 'Acme', active: true });

      expect(result).toEqual({
        items: mockList,
        total: 15,
        page: 2,
        pageSize: 5,
        totalPages: 3,
      });

      expect(repository.list).toHaveBeenCalledWith(userId, {
        skip: 5,
        take: 5,
        search: 'Acme',
        active: true,
      });
    });
  });

  describe('activate/deactivate', () => {
    it('should successfully activate supplier', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.setActiveStatus.mockResolvedValue({ ...mockSupplier, isActive: true });

      const result = await service.activate(supplierId, userId);

      expect(result.isActive).toBe(true);
      expect(repository.setActiveStatus).toHaveBeenCalledWith(supplierId, userId, true);
    });

    it('should successfully deactivate supplier', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.setActiveStatus.mockResolvedValue({ ...mockSupplier, isActive: false });

      const result = await service.deactivate(supplierId, userId);

      expect(result.isActive).toBe(false);
      expect(repository.setActiveStatus).toHaveBeenCalledWith(supplierId, userId, false);
    });
  });

  describe('softDelete', () => {
    it('should successfully soft delete supplier', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.softDelete.mockResolvedValue({ ...mockSupplier, isDeleted: true, isActive: false });

      const result = await service.softDelete(supplierId, userId);

      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
      expect(repository.softDelete).toHaveBeenCalledWith(supplierId, userId);
    });
  });
});
