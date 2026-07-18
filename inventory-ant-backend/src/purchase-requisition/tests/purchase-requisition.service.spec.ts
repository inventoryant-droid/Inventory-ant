import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseRequisitionService } from '../purchase-requisition.service';
import { PurchaseRequisitionRepository } from '../purchase-requisition.repository';
import { PurchaseRequisitionEventEmitter } from '../domain/events/purchase-requisition-event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { UpdateRequisitionDto } from '../dto/update-requisition.dto';

describe('PurchaseRequisitionService', () => {
  let service: PurchaseRequisitionService;
  let repository: jest.Mocked<PurchaseRequisitionRepository>;
  let eventEmitter: jest.Mocked<PurchaseRequisitionEventEmitter>;

  const userId = 'owner-id-123';
  const tenantEmail = 'tenant@test.com';
  const requisitionId = 'req-123';

  const mockRequisition = {
    id: requisitionId,
    userId,
    requestorId: 'employee-123',
    status: 'DRAFT',
    notes: 'Urgent stock needed',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        requisitionId,
        variantId: 'variant-abc',
        quantity: 10,
        estimatedCost: 15.5,
        notes: null,
      },
    ],
  };

  const mockVariants = [
    { id: 'variant-abc', productId: 'prod-abc', sku: 'SKU123', name: 'Variant A', uomId: 'uom-1', defaultCostPrice: 10, defaultSellingPrice: 15 },
  ];

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findByIdWithItems: jest.fn(),
      existsById: jest.fn(),
      findActiveVariants: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequisitionService,
        { provide: PurchaseRequisitionRepository, useValue: mockRepo },
        { provide: PurchaseRequisitionEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<PurchaseRequisitionService>(PurchaseRequisitionService);
    repository = module.get(PurchaseRequisitionRepository);
    eventEmitter = module.get(PurchaseRequisitionEventEmitter);
  });

  describe('create', () => {
    const createDto: CreateRequisitionDto = {
      requestorId: 'employee-123',
      notes: 'Urgent stock needed',
      items: [
        {
          variantId: 'variant-abc',
          quantity: 10,
          estimatedCost: 15.5,
        },
      ],
    };

    it('should successfully create a requisition if variants exist and belong to tenant', async () => {
      repository.findActiveVariants.mockResolvedValue(mockVariants as any);
      repository.create.mockResolvedValue(mockRequisition as any);

      const result = await service.create(userId, tenantEmail, createDto);

      expect(result).toEqual(mockRequisition);
      expect(repository.findActiveVariants).toHaveBeenCalledWith(['variant-abc'], tenantEmail);
      expect(repository.create).toHaveBeenCalledWith(userId, createDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('requisition.created', expect.any(Object));
    });

    it('should throw BadRequestException if duplicate variants are present in list', async () => {
      const duplicateDto: CreateRequisitionDto = {
        requestorId: 'employee-123',
        items: [
          { variantId: 'variant-abc', quantity: 5, estimatedCost: 10 },
          { variantId: 'variant-abc', quantity: 10, estimatedCost: 10 },
        ],
      };

      await expect(service.create(userId, tenantEmail, duplicateDto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if any variant does not exist or belong to tenant', async () => {
      repository.findActiveVariants.mockResolvedValue([]);

      await expect(service.create(userId, tenantEmail, createDto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateRequisitionDto = {
      notes: 'Updated notes',
      items: [
        {
          variantId: 'variant-abc',
          quantity: 15,
          estimatedCost: 14.0,
        },
      ],
    };

    it('should successfully update requisition in DRAFT status', async () => {
      repository.findByIdWithItems.mockResolvedValue(mockRequisition as any);
      repository.findActiveVariants.mockResolvedValue(mockVariants as any);
      repository.update.mockResolvedValue({
        ...mockRequisition,
        notes: 'Updated notes',
      } as any);

      const result = await service.update(requisitionId, userId, tenantEmail, updateDto);

      expect(result.notes).toBe('Updated notes');
      expect(repository.update).toHaveBeenCalledWith(requisitionId, userId, updateDto);
    });

    it('should throw NotFoundException if requisition does not exist', async () => {
      repository.findByIdWithItems.mockResolvedValue(null);

      await expect(service.update(requisitionId, userId, tenantEmail, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if requisition status is not DRAFT', async () => {
      repository.findByIdWithItems.mockResolvedValue({
        ...mockRequisition,
        status: 'PENDING_APPROVAL',
      } as any);

      await expect(service.update(requisitionId, userId, tenantEmail, updateDto)).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('status transitions (State Machine)', () => {
    // 1. Submit
    it('should successfully submit a DRAFT requisition for approval', async () => {
      repository.findByIdWithItems.mockResolvedValue(mockRequisition as any);
      repository.updateStatus.mockResolvedValue({
        ...mockRequisition,
        status: 'PENDING_APPROVAL',
      } as any);

      const result = await service.submit(requisitionId, userId);

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(repository.updateStatus).toHaveBeenCalledWith(requisitionId, userId, 'PENDING_APPROVAL');
      expect(eventEmitter.emit).toHaveBeenCalledWith('requisition.submitted', expect.any(Object));
    });

    it('should throw BadRequestException if submitting a non-DRAFT requisition', async () => {
      repository.findByIdWithItems.mockResolvedValue({
        ...mockRequisition,
        status: 'APPROVED',
      } as any);

      await expect(service.submit(requisitionId, userId)).rejects.toThrow(BadRequestException);
    });

    // 2. Approve
    it('should successfully approve a PENDING_APPROVAL requisition', async () => {
      repository.findByIdWithItems.mockResolvedValue({
        ...mockRequisition,
        status: 'PENDING_APPROVAL',
      } as any);
      repository.updateStatus.mockResolvedValue({
        ...mockRequisition,
        status: 'APPROVED',
      } as any);

      const result = await service.approve(requisitionId, userId);

      expect(result.status).toBe('APPROVED');
      expect(repository.updateStatus).toHaveBeenCalledWith(requisitionId, userId, 'APPROVED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('requisition.approved', expect.any(Object));
    });

    it('should throw BadRequestException if approving a non-PENDING_APPROVAL requisition', async () => {
      repository.findByIdWithItems.mockResolvedValue(mockRequisition as any);

      await expect(service.approve(requisitionId, userId)).rejects.toThrow(BadRequestException);
    });

    // 3. Reject
    it('should successfully reject a PENDING_APPROVAL requisition', async () => {
      repository.findByIdWithItems.mockResolvedValue({
        ...mockRequisition,
        status: 'PENDING_APPROVAL',
      } as any);
      repository.updateStatus.mockResolvedValue({
        ...mockRequisition,
        status: 'REJECTED',
      } as any);

      const result = await service.reject(requisitionId, userId, 'Over budget');

      expect(result.status).toBe('REJECTED');
      expect(repository.updateStatus).toHaveBeenCalledWith(requisitionId, userId, 'REJECTED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('requisition.rejected', expect.any(Object));
    });

    it('should throw BadRequestException if rejecting a non-PENDING_APPROVAL requisition', async () => {
      repository.findByIdWithItems.mockResolvedValue(mockRequisition as any);

      await expect(service.reject(requisitionId, userId, 'Over budget')).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('should return paginated requisitions list with metadata', async () => {
      repository.list.mockResolvedValue({
        items: [mockRequisition],
        total: 1,
      });

      const result = await service.list(userId, { page: 1, pageSize: 10, search: 'Urgent', status: 'DRAFT' });

      expect(result).toEqual({
        items: [mockRequisition],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      expect(repository.list).toHaveBeenCalledWith(userId, {
        skip: 0,
        take: 10,
        search: 'Urgent',
        status: 'DRAFT',
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete requisition if it exists', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.softDelete.mockResolvedValue({
        ...mockRequisition,
        isDeleted: true,
      } as any);

      const result = await service.softDelete(requisitionId, userId);

      expect(result.isDeleted).toBe(true);
      expect(repository.softDelete).toHaveBeenCalledWith(requisitionId, userId);
    });

    it('should throw NotFoundException on delete if requisition does not exist', async () => {
      repository.existsById.mockResolvedValue(false);

      await expect(service.softDelete(requisitionId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});
