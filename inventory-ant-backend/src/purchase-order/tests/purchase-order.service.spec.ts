import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderService } from '../purchase-order.service';
import { PurchaseOrderRepository } from '../purchase-order.repository';
import { SupplierQuotationRepository } from '../../supplier-quotation/supplier-quotation.repository';
import { RequestForQuotationRepository } from '../../request-for-quotation/request-for-quotation.repository';
import { SupplierRepository } from '../../supplier/supplier.repository';
import { PurchaseOrderEventEmitter } from '../domain/events/po-event-emitter';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import { CreatePurchaseOrderDto } from '../dto/create-po.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-po.dto';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let repository: jest.Mocked<PurchaseOrderRepository>;
  let quotationRepository: jest.Mocked<SupplierQuotationRepository>;
  let rfqRepository: jest.Mocked<RequestForQuotationRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let eventEmitter: jest.Mocked<PurchaseOrderEventEmitter>;

  const userId = 'tenant-123';
  const createdBy = 'user-sub-456';
  const quotationId = 'quote-123';
  const rfqId = 'rfq-123';
  const supplierId = 'sup-123';
  const warehouseId = 'wh-123';
  const poId = 'po-123';

  const mockQuotation = {
    id: quotationId,
    rfqId,
    supplierId,
    userId,
    status: 'SELECTED',
    items: [
      { variantId: 'v-1', quantity: 10, unitPrice: 15.0, discount: 1.0, taxRate: 5.0 },
    ],
  };

  const mockRFQ = {
    id: rfqId,
    status: 'READY_FOR_PO',
    isDeleted: false,
  };

  const mockSupplier = {
    id: supplierId,
    userId,
    isActive: true,
    isDeleted: false,
  };

  const mockWarehouse = {
    id: warehouseId,
    userId,
    isActive: true,
  };

  const mockPO = {
    id: poId,
    poNumber: 'PO-2026-000001',
    userId,
    supplierId,
    rfqId,
    quotationId,
    warehouseId,
    status: PurchaseStatus.DRAFT,
    subtotal: 150,
    discount: 10,
    tax: 7.0,
    total: 147.0,
  };

  beforeEach(async () => {
    const mockRepo = {
      existsById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      generatePONumber: jest.fn(),
      hasExistingPOForQuotation: jest.fn(),
      findWarehouse: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
    };

    const mockQuoteRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockRfqRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockSupplierRepo = {
      findById: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        { provide: PurchaseOrderRepository, useValue: mockRepo },
        { provide: SupplierQuotationRepository, useValue: mockQuoteRepo },
        { provide: RequestForQuotationRepository, useValue: mockRfqRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
        { provide: PurchaseOrderEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    repository = module.get(PurchaseOrderRepository);
    quotationRepository = module.get(SupplierQuotationRepository);
    rfqRepository = module.get(RequestForQuotationRepository);
    supplierRepository = module.get(SupplierRepository);
    eventEmitter = module.get(PurchaseOrderEventEmitter);
  });

  describe('create', () => {
    const createDto: CreatePurchaseOrderDto = {
      quotationId,
      warehouseId,
      orderDate: new Date().toISOString(),
    };

    it('should successfully create PO if all details are correct', async () => {
      quotationRepository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      rfqRepository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.hasExistingPOForQuotation.mockResolvedValue(false);
      repository.generatePONumber.mockResolvedValue('PO-2026-000001');
      repository.create.mockResolvedValue(mockPO as any);

      const result = await service.create(userId, createdBy, createDto);

      expect(result).toEqual(mockPO);
      expect(repository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.created', expect.any(Object));
    });

    it('should throw BadRequestException if quotation is not SELECTED', async () => {
      quotationRepository.findByIdWithDetails.mockResolvedValue({
        ...mockQuotation,
        status: 'SUBMITTED',
      } as any);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if RFQ is not READY_FOR_PO', async () => {
      quotationRepository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      rfqRepository.findByIdWithDetails.mockResolvedValue({
        ...mockRFQ,
        status: 'SENT',
      } as any);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Warehouse does not exist or is inactive', async () => {
      quotationRepository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      rfqRepository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.findWarehouse.mockResolvedValue(null);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if PO already exists for quotation', async () => {
      quotationRepository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      rfqRepository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.hasExistingPOForQuotation.mockResolvedValue(true);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto: UpdatePurchaseOrderDto = { notes: 'Updated notes' };

    it('should successfully update PO in DRAFT status', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.update.mockResolvedValue({ ...mockPO, notes: 'Updated notes' } as any);

      const result = await service.update(poId, userId, updateDto);

      expect(result.notes).toBe('Updated notes');
      expect(repository.update).toHaveBeenCalledWith(poId, userId, updateDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.updated', expect.any(Object));
    });

    it('should throw BadRequestException if PO status is not DRAFT', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockPO, status: PurchaseStatus.PENDING_APPROVAL } as any);

      await expect(service.update(poId, userId, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('status transitions', () => {
    it('should transition from DRAFT to PENDING_APPROVAL', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.updateStatus.mockResolvedValue({ ...mockPO, status: PurchaseStatus.PENDING_APPROVAL } as any);

      const result = await service.submit(poId, userId);

      expect(result.status).toBe(PurchaseStatus.PENDING_APPROVAL);
      expect(repository.updateStatus).toHaveBeenCalledWith(poId, userId, PurchaseStatus.PENDING_APPROVAL);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.submitted', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.ready-for-approval', expect.any(Object));
    });

    it('should transition from DRAFT to CANCELLED', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.updateStatus.mockResolvedValue({ ...mockPO, status: PurchaseStatus.CANCELLED } as any);

      const result = await service.cancel(poId, userId);

      expect(result.status).toBe(PurchaseStatus.CANCELLED);
      expect(repository.updateStatus).toHaveBeenCalledWith(poId, userId, PurchaseStatus.CANCELLED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.cancelled', expect.any(Object));
    });

    it('should throw BadRequestException if submitting a non-DRAFT Purchase Order', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockPO, status: PurchaseStatus.PENDING_APPROVAL } as any);

      await expect(service.submit(poId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
