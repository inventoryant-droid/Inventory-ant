import { Test, TestingModule } from '@nestjs/testing';
import { RequestForQuotationService } from '../request-for-quotation.service';
import { RequestForQuotationRepository } from '../request-for-quotation.repository';
import { PurchaseRequisitionRepository } from '../../purchase-requisition/purchase-requisition.repository';
import { SupplierRepository } from '../../supplier/supplier.repository';
import { RFQEventEmitter } from '../domain/events/rfq-event-emitter';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRFQDto } from '../dto/create-rfq.dto';
import { UpdateRFQDto } from '../dto/update-rfq.dto';

describe('RequestForQuotationService', () => {
  let service: RequestForQuotationService;
  let repository: jest.Mocked<RequestForQuotationRepository>;
  let requisitionRepository: jest.Mocked<PurchaseRequisitionRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let eventEmitter: jest.Mocked<RFQEventEmitter>;

  const userId = 'tenant-123';
  const createdBy = 'user-sub-123';
  const rfqId = 'rfq-abc';

  const mockRequisition = {
    id: 'req-123',
    userId,
    status: 'APPROVED',
    isDeleted: false,
    items: [
      { variantId: 'v-1', quantity: 5, estimatedCost: 10, notes: 'urgent' },
    ],
  };

  const mockRFQ = {
    id: rfqId,
    rfqNumber: 'RFQ-2026-000001',
    userId,
    requisitionId: 'req-123',
    status: 'DRAFT',
    expiryDate: new Date(),
    createdBy,
    isDeleted: false,
    items: [
      { id: 'rfq-item-1', variantId: 'v-1', quantity: 5, estimatedCost: 10, notes: 'urgent' },
    ],
    suppliers: [],
  };

  const mockSupplier = {
    id: 'supplier-xyz',
    userId,
    name: 'Best Supplier',
    isActive: true,
    isDeleted: false,
  };

  beforeEach(async () => {
    const mockRepo = {
      generateRFQNumber: jest.fn(),
      checkRequisitionHasActiveRFQ: jest.fn(),
      createFromRequisition: jest.fn(),
      update: jest.fn(),
      findByIdWithDetails: jest.fn(),
      existsById: jest.fn(),
      addSupplierToRFQ: jest.fn(),
      removeSupplierFromRFQ: jest.fn(),
      getSuppliersForRFQ: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockReqRepo = {
      findByIdWithItems: jest.fn(),
    };

    const mockSupplierRepo = {
      findById: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestForQuotationService,
        { provide: RequestForQuotationRepository, useValue: mockRepo },
        { provide: PurchaseRequisitionRepository, useValue: mockReqRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
        { provide: RFQEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<RequestForQuotationService>(RequestForQuotationService);
    repository = module.get(RequestForQuotationRepository);
    requisitionRepository = module.get(PurchaseRequisitionRepository);
    supplierRepository = module.get(SupplierRepository);
    eventEmitter = module.get(RFQEventEmitter);
  });

  describe('create', () => {
    const createDto: CreateRFQDto = {
      requisitionId: 'req-123',
      expiryDate: new Date().toISOString(),
    };

    it('should successfully create RFQ from approved requisition', async () => {
      requisitionRepository.findByIdWithItems.mockResolvedValue(mockRequisition as any);
      repository.checkRequisitionHasActiveRFQ.mockResolvedValue(false);
      repository.generateRFQNumber.mockResolvedValue('RFQ-2026-000001');
      repository.createFromRequisition.mockResolvedValue(mockRFQ as any);

      const result = await service.create(userId, createdBy, createDto);

      expect(result).toEqual(mockRFQ);
      expect(requisitionRepository.findByIdWithItems).toHaveBeenCalledWith('req-123', userId);
      expect(repository.checkRequisitionHasActiveRFQ).toHaveBeenCalledWith('req-123', userId);
      expect(repository.createFromRequisition).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.created', expect.any(Object));
    });

    it('should throw BadRequestException if requisition is not APPROVED', async () => {
      requisitionRepository.findByIdWithItems.mockResolvedValue({
        ...mockRequisition,
        status: 'DRAFT',
      } as any);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
      expect(repository.createFromRequisition).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if requisition already has an active RFQ', async () => {
      requisitionRepository.findByIdWithItems.mockResolvedValue(mockRequisition as any);
      repository.checkRequisitionHasActiveRFQ.mockResolvedValue(true);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(ConflictException);
      expect(repository.createFromRequisition).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateRFQDto = { expiryDate: new Date().toISOString() };

    it('should successfully update RFQ in DRAFT status', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      repository.update.mockResolvedValue({ ...mockRFQ, expiryDate: new Date(updateDto.expiryDate!) } as any);

      const result = await service.update(rfqId, userId, updateDto);

      expect(result.id).toBe(rfqId);
      expect(repository.update).toHaveBeenCalledWith(rfqId, userId, updateDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.updated', expect.any(Object));
    });

    it('should throw BadRequestException if RFQ is not in DRAFT status', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockRFQ, status: 'SENT' } as any);

      await expect(service.update(rfqId, userId, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('suppliers management', () => {
    describe('addSupplier', () => {
      it('should successfully add supplier if supplier exists, is active, not deleted, and belongs to tenant', async () => {
        repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
        supplierRepository.findById.mockResolvedValue(mockSupplier as any);
        repository.addSupplierToRFQ.mockResolvedValue({ id: 'conn-1', rfqId, supplierId: mockSupplier.id } as any);

        const result = await service.addSupplier(rfqId, userId, mockSupplier.id);

        expect(result.supplierId).toBe(mockSupplier.id);
        expect(repository.addSupplierToRFQ).toHaveBeenCalledWith(rfqId, mockSupplier.id);
        expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.supplier.added', expect.any(Object));
      });

      it('should throw BadRequestException if supplier is inactive', async () => {
        repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
        supplierRepository.findById.mockResolvedValue({ ...mockSupplier, isActive: false } as any);

        await expect(service.addSupplier(rfqId, userId, mockSupplier.id)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if supplier is soft-deleted', async () => {
        repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
        supplierRepository.findById.mockResolvedValue({ ...mockSupplier, isDeleted: true } as any);

        await expect(service.addSupplier(rfqId, userId, mockSupplier.id)).rejects.toThrow(BadRequestException);
      });

      it('should throw ConflictException if supplier is already assigned to the RFQ', async () => {
        repository.findByIdWithDetails.mockResolvedValue({
          ...mockRFQ,
          suppliers: [{ id: 'conn-1', rfqId, supplierId: mockSupplier.id }],
        } as any);
        supplierRepository.findById.mockResolvedValue(mockSupplier as any);

        await expect(service.addSupplier(rfqId, userId, mockSupplier.id)).rejects.toThrow(ConflictException);
      });
    });

    describe('removeSupplier', () => {
      it('should successfully remove supplier if assigned', async () => {
        repository.findByIdWithDetails.mockResolvedValue({
          ...mockRFQ,
          suppliers: [{ id: 'conn-1', rfqId, supplierId: mockSupplier.id }],
        } as any);
        repository.removeSupplierFromRFQ.mockResolvedValue({ id: 'conn-1', rfqId, supplierId: mockSupplier.id } as any);

        const result = await service.removeSupplier(rfqId, userId, mockSupplier.id);

        expect(result.supplierId).toBe(mockSupplier.id);
        expect(repository.removeSupplierFromRFQ).toHaveBeenCalledWith(rfqId, mockSupplier.id);
        expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.supplier.removed', expect.any(Object));
      });

      it('should throw NotFoundException if supplier is not assigned', async () => {
        repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);

        await expect(service.removeSupplier(rfqId, userId, mockSupplier.id)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('state machine transitions', () => {
    // DRAFT -> SENT
    it('should transition from DRAFT to SENT if at least one supplier is assigned', async () => {
      repository.findByIdWithDetails.mockResolvedValue({
        ...mockRFQ,
        suppliers: [{ id: 'conn-1', rfqId, supplierId: mockSupplier.id }],
      } as any);
      repository.updateStatus.mockResolvedValue({ ...mockRFQ, status: 'SENT' } as any);

      const result = await service.send(rfqId, userId);

      expect(result.status).toBe('SENT');
      expect(repository.updateStatus).toHaveBeenCalledWith(rfqId, userId, 'SENT');
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.sent', expect.any(Object));
    });

    it('should throw BadRequestException on send if no suppliers are assigned', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);

      await expect(service.send(rfqId, userId)).rejects.toThrow(BadRequestException);
    });

    // SENT -> RESPONSES_CLOSED
    it('should transition from SENT to RESPONSES_CLOSED', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockRFQ, status: 'SENT' } as any);
      repository.updateStatus.mockResolvedValue({ ...mockRFQ, status: 'RESPONSES_CLOSED' } as any);

      const result = await service.closeResponses(rfqId, userId);

      expect(result.status).toBe('RESPONSES_CLOSED');
      expect(repository.updateStatus).toHaveBeenCalledWith(rfqId, userId, 'RESPONSES_CLOSED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.responses-closed', expect.any(Object));
    });

    // RESPONSES_CLOSED -> CLOSED
    it('should transition from RESPONSES_CLOSED to CLOSED', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockRFQ, status: 'RESPONSES_CLOSED' } as any);
      repository.updateStatus.mockResolvedValue({ ...mockRFQ, status: 'CLOSED' } as any);

      const result = await service.close(rfqId, userId);

      expect(result.status).toBe('CLOSED');
      expect(repository.updateStatus).toHaveBeenCalledWith(rfqId, userId, 'CLOSED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.closed', expect.any(Object));
    });

    it('should throw BadRequestException on invalid transition', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockRFQ as any); // DRAFT status

      await expect(service.close(rfqId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
