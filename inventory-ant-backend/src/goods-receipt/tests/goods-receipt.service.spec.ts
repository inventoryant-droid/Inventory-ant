import { Test, TestingModule } from '@nestjs/testing';
import { GoodsReceiptService } from '../goods-receipt.service';
import { GoodsReceiptRepository } from '../goods-receipt.repository';
import { PurchaseOrderRepository } from '../../purchase-order/purchase-order.repository';
import { SupplierRepository } from '../../supplier/supplier.repository';
import { InventoryService } from '../../inventory/application/services/inventory.service';
import { GoodsReceiptEventEmitter } from '../domain/events/grn-event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import { CreateGoodsReceiptDto } from '../dto/create-grn.dto';
import { PrismaService } from '../../prisma.service';

describe('GoodsReceiptService', () => {
  let service: GoodsReceiptService;
  let repository: jest.Mocked<GoodsReceiptRepository>;
  let poRepository: jest.Mocked<PurchaseOrderRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let eventEmitter: jest.Mocked<GoodsReceiptEventEmitter>;
  let prisma: jest.Mocked<PrismaService>;

  const userId = 'tenant-123';
  const receivedBy = 'Operator NY';
  const purchaseOrderId = 'po-123';
  const grnId = 'grn-123';
  const variantId = 'v-1';
  const warehouseId = 'wh-123';

  const mockPO = {
    id: purchaseOrderId,
    supplierId: 'sup-123',
    status: PurchaseStatus.APPROVED,
    userId,
    items: [
      { variantId, quantity: 100 },
    ],
  };

  const mockSupplier = {
    id: 'sup-123',
    userId,
    isActive: true,
    isDeleted: false,
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

  const mockGRN = {
    id: grnId,
    grnNumber: 'GRN-2026-000001',
    purchaseOrderId,
    status: 'DRAFT',
    userId,
    receivedBy,
    items: [
      {
        variantId,
        quantityReceived: 40,
        batchNumber: 'BATCH-001',
        warehouseId,
        purchasePrice: 10.0,
        mrp: 15.0,
      },
    ],
  };

  beforeEach(async () => {
    const mockRepo = {
      existsById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      generateGRNNumber: jest.fn(),
      getReceivedQuantitiesForPO: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      updatePOStatus: jest.fn(),
      list: jest.fn(),
      findWarehouse: jest.fn(),
      findVariant: jest.fn(),
    };

    const mockPoRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockSupplierRepo = {
      findById: jest.fn(),
    };

    const mockInvService = {
      stockIn: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const mockPrisma = {
      productBatch: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptService,
        { provide: GoodsReceiptRepository, useValue: mockRepo },
        { provide: PurchaseOrderRepository, useValue: mockPoRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
        { provide: InventoryService, useValue: mockInvService },
        { provide: GoodsReceiptEventEmitter, useValue: mockEmitter },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GoodsReceiptService>(GoodsReceiptService);
    repository = module.get(GoodsReceiptRepository);
    poRepository = module.get(PurchaseOrderRepository);
    supplierRepository = module.get(SupplierRepository);
    inventoryService = module.get(InventoryService);
    eventEmitter = module.get(GoodsReceiptEventEmitter);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    const createDto: CreateGoodsReceiptDto = {
      purchaseOrderId,
      receiveDate: new Date().toISOString(),
      items: [
        {
          variantId,
          quantityReceived: 40,
          batchNumber: 'BATCH-001',
          warehouseId,
          purchasePrice: 10.0,
          mrp: 15.0,
        },
      ],
    };

    it('should successfully create GRN in DRAFT status', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({});
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);
      repository.generateGRNNumber.mockResolvedValue('GRN-2026-000001');
      repository.create.mockResolvedValue(mockGRN as any);

      const result = await service.create(userId, receivedBy, createDto);

      expect(result).toEqual(mockGRN);
      expect(repository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('grn.created', expect.any(Object));
    });

    it('should throw BadRequestException if received quantity is higher than remaining PO quantity', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({ [variantId]: 80 }); // only 20 remaining
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(mockWarehouse as any);

      await expect(service.create(userId, receivedBy, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if warehouse does not exist or is inactive', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      supplierRepository.findById.mockResolvedValue(mockSupplier as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({});
      repository.findVariant.mockResolvedValue(mockVariant as any);
      repository.findWarehouse.mockResolvedValue(null);

      await expect(service.create(userId, receivedBy, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('receive', () => {
    it('should set PO status to PARTIALLY_RECEIVED on partial receive', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({});
      prisma.productBatch.findFirst.mockResolvedValue({ id: 'batch-1' } as any);
      inventoryService.stockIn.mockResolvedValue({} as any);

      await service.receive(grnId, userId);

      expect(repository.updateStatus).toHaveBeenCalledWith(grnId, 'RECEIVING', userId);
      expect(inventoryService.stockIn).toHaveBeenCalledWith({
        variantId,
        warehouseId,
        quantity: 40,
        batchNumber: 'BATCH-001',
        referenceId: grnId,
        operatorName: receivedBy,
        notes: mockGRN.notes || `Stock in from GRN ${mockGRN.grnNumber}`,
        purchasePrice: 10,
        mrp: 15,
      });
      expect(repository.updateStatus).toHaveBeenCalledWith(grnId, 'COMPLETED', userId);
      expect(repository.updatePOStatus).toHaveBeenCalledWith(purchaseOrderId, userId, PurchaseStatus.PARTIALLY_RECEIVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.partially-received', expect.any(Object));
    });

    it('should set PO status to RECEIVED on full receive completion', async () => {
      const fullGRN = {
        ...mockGRN,
        items: [
          { ...mockGRN.items[0], quantityReceived: 100 },
        ],
      };
      repository.findByIdWithDetails.mockResolvedValue(fullGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({});
      prisma.productBatch.findFirst.mockResolvedValue({ id: 'batch-1' } as any);
      inventoryService.stockIn.mockResolvedValue({} as any);

      await service.receive(grnId, userId);

      expect(repository.updatePOStatus).toHaveBeenCalledWith(purchaseOrderId, userId, PurchaseStatus.RECEIVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.received', expect.any(Object));
    });

    it('should create ProductBatch dynamically if it does not exist', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.getReceivedQuantitiesForPO.mockResolvedValue({});
      prisma.productBatch.findFirst.mockResolvedValue(null);
      prisma.productBatch.create.mockResolvedValue({ id: 'new-batch-id' } as any);
      inventoryService.stockIn.mockResolvedValue({} as any);

      await service.receive(grnId, userId);

      expect(prisma.productBatch.create).toHaveBeenCalled();
      expect(inventoryService.stockIn).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should successfully cancel a DRAFT GRN', async () => {
      repository.findByIdWithDetails.mockResolvedValue(mockGRN as any);
      repository.updateStatus.mockResolvedValue({ ...mockGRN, status: 'CANCELLED' } as any);

      const result = await service.cancel(grnId, userId);

      expect(result.status).toBe('CANCELLED');
      expect(repository.updateStatus).toHaveBeenCalledWith(grnId, 'CANCELLED', userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('grn.cancelled', expect.any(Object));
    });

    it('should throw BadRequestException when cancelling a non-DRAFT GRN', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...mockGRN, status: 'COMPLETED' } as any);

      await expect(service.cancel(grnId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
