import { Test, TestingModule } from '@nestjs/testing';
import { SupplierQuotationService } from '../supplier-quotation.service';
import { SupplierQuotationRepository } from '../supplier-quotation.repository';
import { RequestForQuotationRepository } from '../../request-for-quotation/request-for-quotation.repository';
import { SupplierRepository } from '../../supplier/supplier.repository';
import { QuotationEventEmitter } from '../domain/events/quotation-event-emitter';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SubmitQuotationDto } from '../dto/submit-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';

describe('SupplierQuotationService', () => {
  let service: SupplierQuotationService;
  let repository: jest.Mocked<SupplierQuotationRepository>;
  let rfqRepository: jest.Mocked<RequestForQuotationRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let eventEmitter: jest.Mocked<QuotationEventEmitter>;

  const userId = 'tenant-123';
  const tenantEmail = 'tenant@test.com';
  const quotationId = 'quote-abc';
  const rfqId = 'rfq-123';
  const supplierId = 'sup-123';

  const mockRFQ = {
    id: rfqId,
    rfqNumber: 'RFQ-2026-000001',
    userId,
    status: 'SENT',
    expiryDate: new Date(Date.now() + 86400000), // tomorrow
    createdBy: 'user-1',
    isDeleted: false,
    suppliers: [
      { supplierId },
    ],
  };

  const mockSupplier = {
    id: supplierId,
    userId,
    name: 'Reliable Supplier',
    isActive: true,
    isDeleted: false,
  };

  const mockQuotation = {
    id: quotationId,
    rfqId,
    supplierId,
    userId,
    status: 'SUBMITTED',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'q-item-1',
        quotationId,
        variantId: 'v-1',
        quantity: 10,
        unitPrice: 12.5,
        taxRate: 5.0,
        discount: 1.0,
        deliveryLeadTime: 5,
        remarks: null,
      },
    ],
  };

  const mockVariants = [
    { id: 'v-1', name: 'Variant A', productId: 'p-1' },
  ];

  beforeEach(async () => {
    const mockRepo = {
      existsById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findActiveQuotationForSupplier: jest.fn(),
      submit: jest.fn(),
      update: jest.fn(),
      withdraw: jest.fn(),
      updateStatus: jest.fn(),
      rejectOtherQuotations: jest.fn(),
      updateRFQStatus: jest.fn(),
      list: jest.fn(),
    };

    const mockRfqRepo = {
      findByIdWithDetails: jest.fn(),
      findActiveVariants: jest.fn(),
    };

    const mockSupplierRepo = {
      findById: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierQuotationService,
        { provide: SupplierQuotationRepository, useValue: mockRepo },
        { provide: RequestForQuotationRepository, useValue: mockRfqRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
        { provide: QuotationEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<SupplierQuotationService>(SupplierQuotationService);
    repository = module.get(SupplierQuotationRepository);
    rfqRepository = module.get(RequestForQuotationRepository);
    supplierRepository = module.get(SupplierRepository);
    eventEmitter = module.get(QuotationEventEmitter);
  });

  describe('submit', () => {
    const submitDto: SubmitQuotationDto = {
      rfqId,
      supplierId,
      items: [
        {
          variantId: 'v-1',
          quantity: 10,
          unitPrice: 12.5,
          taxRate: 5.0,
          discount: 1.0,
          deliveryLeadTime: 5,
        },
      ],
    };

    it('should successfully submit quotation if RFQ, supplier and variants are valid', async () => {
      rfqRepository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.findActiveQuotationForSupplier.mockResolvedValue(null);
      rfqRepository.findActiveVariants.mockResolvedValue(mockVariants as any);
      repository.submit.mockResolvedValue(mockQuotation as any);

      const result = await service.submit(userId, tenantEmail, submitDto);

      expect(result).toEqual(mockQuotation);
      expect(repository.submit).toHaveBeenCalledWith(userId, submitDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.submitted', expect.any(Object));
    });

    it('should throw BadRequestException if RFQ is expired', async () => {
      rfqRepository.findByIdWithDetails.mockResolvedValue({
        ...mockRFQ,
        expiryDate: new Date(Date.now() - 3600000), // 1 hour ago
      } as any);

      await expect(service.submit(userId, tenantEmail, submitDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if supplier is not assigned to RFQ', async () => {
      rfqRepository.findByIdWithDetails.mockResolvedValue({
        ...mockRFQ,
        suppliers: [],
      } as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);

      await expect(service.submit(userId, tenantEmail, submitDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if supplier already submitted an active quotation', async () => {
      rfqRepository.findByIdWithDetails.mockResolvedValue(mockRFQ as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.findActiveQuotationForSupplier.mockResolvedValue(mockQuotation as any);

      await expect(service.submit(userId, tenantEmail, submitDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateQuotationDto = {
      items: [
        {
          variantId: 'v-1',
          quantity: 12,
          unitPrice: 12.0,
          taxRate: 5.0,
          discount: 1.0,
          deliveryLeadTime: 4,
        },
      ],
    };

    it('should successfully update quotation in SUBMITTED status', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      rfqRepository.findActiveVariants.mockResolvedValue(mockVariants as any);
      repository.update.mockResolvedValue({ ...mockQuotation, items: [] } as any);

      const result = await service.update(quotationId, userId, tenantEmail, updateDto);

      expect(result.id).toBe(quotationId);
      expect(repository.update).toHaveBeenCalledWith(quotationId, userId, updateDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.updated', expect.any(Object));
    });

    it('should throw BadRequestException if quotation is not in SUBMITTED status', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockQuotation, status: 'UNDER_REVIEW' } as any);

      await expect(service.update(quotationId, userId, tenantEmail, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    it('should successfully withdraw quotation in SUBMITTED status', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      repository.withdraw.mockResolvedValue(mockQuotation as any);

      const result = await service.withdraw(quotationId, userId);

      expect(result).toEqual(mockQuotation);
      expect(repository.withdraw).toHaveBeenCalledWith(quotationId, userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.withdrawn', expect.any(Object));
    });

    it('should throw BadRequestException if quotation is under review or selected', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockQuotation, status: 'UNDER_REVIEW' } as any);

      await expect(service.withdraw(quotationId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('status transitions', () => {
    it('should transition to UNDER_REVIEW from SUBMITTED', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      repository.updateStatus.mockResolvedValue({ ...mockQuotation, status: 'UNDER_REVIEW' } as any);

      const result = await service.review(quotationId, userId);

      expect(result.status).toBe('UNDER_REVIEW');
      expect(repository.updateStatus).toHaveBeenCalledWith(quotationId, userId, 'UNDER_REVIEW');
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.review-started', expect.any(Object));
    });

    it('should select winning quotation, reject others, and transition RFQ to READY_FOR_PO', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockQuotation, status: 'UNDER_REVIEW' } as any);
      repository.updateStatus.mockResolvedValue({ ...mockQuotation, status: 'SELECTED' } as any);

      const result = await service.select(quotationId, userId);

      expect(result.status).toBe('SELECTED');
      expect(repository.updateStatus).toHaveBeenCalledWith(quotationId, userId, 'SELECTED');
      expect(repository.rejectOtherQuotations).toHaveBeenCalledWith(rfqId, quotationId, userId);
      expect(repository.updateRFQStatus).toHaveBeenCalledWith(rfqId, userId, 'READY_FOR_PO');
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.selected', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.winning-selected', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('rfq.ready-for-po', expect.any(Object));
    });

    it('should reject quotation in SUBMITTED or UNDER_REVIEW status', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockQuotation, status: 'UNDER_REVIEW' } as any);
      repository.updateStatus.mockResolvedValue({ ...mockQuotation, status: 'REJECTED' } as any);

      const result = await service.reject(quotationId, userId);

      expect(result.status).toBe('REJECTED');
      expect(repository.updateStatus).toHaveBeenCalledWith(quotationId, userId, 'REJECTED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('quotation.rejected', expect.any(Object));
    });

    it('should throw BadRequestException if transitioning selected quotation to rejected directly', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockQuotation, status: 'SELECTED' } as any);

      await expect(service.reject(quotationId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
