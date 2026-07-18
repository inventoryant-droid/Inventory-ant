import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseReturnService } from '../purchase-return.service';
import { PurchaseReturnRepository } from '../purchase-return.repository';
import { GoodsReceiptRepository } from '../../goods-receipt/goods-receipt.repository';
import { PurchaseOrderRepository } from '../../purchase-order/purchase-order.repository';
import { SupplierRepository } from '../../supplier/supplier.repository';
import { InventoryService } from '../../inventory/application/services/inventory.service';
import { PurchaseReturnEventEmitter } from '../domain/events/return-event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseReturnReason } from '@prisma/client';
import { CreatePurchaseReturnDto } from '../dto/create-return.dto';

describe('PurchaseReturnService', () => {
  let service: PurchaseReturnService;
  let repository: jest.Mocked<PurchaseReturnRepository>;
  let grnRepository: jest.Mocked<GoodsReceiptRepository>;
  let poRepository: jest.Mocked<PurchaseOrderRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let eventEmitter: jest.Mocked<PurchaseReturnEventEmitter>;

  const userId = 'tenant-123';
  const createdBy = 'Operator Return';
  const purchaseOrderId = 'po-123';
  const goodsReceiptId = 'grn-123';
  const returnId = 'ret-123';
  const variantId = 'v-1';
  const batchId = 'b-1';
  const warehouseId = 'wh-123';

  const mockPO = {
    id: purchaseOrderId,
    supplierId: 'sup-123',
    status: 'RECEIVED',
    userId,
  };

  const mockSupplier = {
    id: 'sup-123',
    userId,
    isActive: true,
    isDeleted: false,
  };

  const mockGRN = {
    id: goodsReceiptId,
    status: 'COMPLETED',
    userId,
    items: [
      {
        variantId,
        quantityReceived: 50,
        batchNumber: 'BATCH-001',
        warehouseId,
      },
    ],
  };

  const mockWarehouse = {
    id: warehouseId,
    userId,
    isActive: true,
  };

  const mockVariant = {
    id: variantId,
    productId: 'p-1',
  };

  const mockBatch = {
    id: batchId,
    batchNumber: 'BATCH-001',
    variantId,
  };

  const mockReturn = {
    id: returnId,
    returnNumber: 'PRTN-2026-000001',
    purchaseOrderId,
    goodsReceiptId,
    status: 'DRAFT',
    userId,
    createdBy,
    items: [
      {
        variantId,
        batchId,
        quantity: 20,
        reason: PurchaseReturnReason.DAMAGED,
        remarks: 'cracked screens',
        warehouseId,
        batch: mockBatch,
      },
    ],
    purchaseOrder: mockPO,
    goodsReceipt: mockGRN,
  };

  beforeEach(async () => {
    const mockRepo = {
      existsById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      generatePRTNNumber: jest.fn(),
      getReturnedQuantitiesForGRN: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
      findWarehouse: jest.fn(),
      findVariant: jest.fn(),
      findBatch: jest.fn(),
    };

    const mockGrnRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockPoRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockSupplierRepo = {
      findById: jest.fn(),
    };

    const mockInvService = {
      stockOut: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseReturnService,
        { provide: PurchaseReturnRepository, useValue: mockRepo },
        { provide: GoodsReceiptRepository, useValue: mockGrnRepo },
        { provide: PurchaseOrderRepository, useValue: mockPoRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
        { provide: InventoryService, useValue: mockInvService },
        { provide: PurchaseReturnEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<PurchaseReturnService>(PurchaseReturnService);
    repository = module.get(PurchaseReturnRepository);
    grnRepository = module.get(GoodsReceiptRepository);
    poRepository = module.get(PurchaseOrderRepository);
    supplierRepository = module.get(SupplierRepository);
    inventoryService = module.get(InventoryService);
    eventEmitter = module.get(PurchaseReturnEventEmitter);
  });

  describe('create', () => {
    const createDto: CreatePurchaseReturnDto = {
      purchaseOrderId,
      goodsReceiptId,
      items: [
        {
          variantId,
          batchId,
          quantity: 20,
          reason: PurchaseReturnReason.DAMAGED,
          remarks: 'cracked screens',
          warehouseId,
        },
      ],
    };

    it('should successfully create return in DRAFT status', async () => {
      grnRepository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReturnedQuantitiesForGRN.mockResolvedValue({});
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.findBatch.mockResolvedValue(mockBatch as any);
      repository.generatePRTNNumber.mockResolvedValue('PRTN-2026-000001');
      repository.create.mockResolvedValue(mockReturn as any);

      const result = await service.create(userId, createdBy, createDto);

      expect(result).toEqual(mockReturn);
      expect(repository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('return.created', expect.any(Object));
    });

    it('should throw BadRequestException if returned quantity exceeds received quantity', async () => {
      grnRepository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReturnedQuantitiesForGRN.mockResolvedValue({ [`${variantId}_${batchId}`]: 40 }); // only 10 remaining
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.findBatch.mockResolvedValue(mockBatch as any);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if batch is not found', async () => {
      grnRepository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReturnedQuantitiesForGRN.mockResolvedValue({});
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.findBatch.mockResolvedValue(null);

      await expect(service.create(userId, createdBy, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve & complete', () => {
    it('should transition return from DRAFT to APPROVED', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockReturn as any);
      repository.updateStatus.mockResolvedValue({ ...mockReturn, status: 'APPROVED' } as any);

      const result = await service.approve(returnId, userId);

      expect(result.status).toBe('APPROVED');
      expect(repository.updateStatus).toHaveBeenCalledWith(returnId, 'APPROVED', userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('return.approved', expect.any(Object));
    });

    it('should transition return to COMPLETED and invoke InventoryService.stockOut', async () => {
      const approvedReturn = { ...mockReturn, status: 'APPROVED' };
      repository.findByIdWithDetails.mockResolvedValue(approvedReturn as any);
      repository.getReturnedQuantitiesForGRN.mockResolvedValue({});
      inventoryService.stockOut.mockResolvedValue({} as any);
      repository.updateStatus.mockResolvedValue({ ...approvedReturn, status: 'COMPLETED' } as any);

      await service.complete(returnId, userId);

      expect(inventoryService.stockOut).toHaveBeenCalledWith({
        userId,
        variantId,
        warehouseId,
        quantity: 20,
        referenceId: returnId,
        operatorName: createdBy,
        notes: mockReturn.notes || `Stock out from Purchase Return ${mockReturn.returnNumber}`,
      });
      expect(repository.updateStatus).toHaveBeenCalledWith(returnId, 'COMPLETED', userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('return.completed', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('supplier.credit-pending', expect.any(Object));
    });
  });

  describe('cancel', () => {
    it('should successfully cancel a DRAFT return', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockReturn as any);
      repository.updateStatus.mockResolvedValue({ ...mockReturn, status: 'CANCELLED' } as any);

      const result = await service.cancel(returnId, userId);

      expect(result.status).toBe('CANCELLED');
      expect(repository.updateStatus).toHaveBeenCalledWith(returnId, 'CANCELLED', userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('return.cancelled', expect.any(Object));
    });

    it('should throw BadRequestException when cancelling an APPROVED return', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockReturn, status: 'APPROVED' } as any);

      await expect(service.cancel(returnId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
