import { Test, TestingModule } from '@nestjs/testing';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { PrismaService } from '../../prisma.service';
import { 
  BatchNotFoundException, 
  InsufficientStockException, 
  InvalidReservationException 
} from '../application/exceptions/inventory.exceptions';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let prismaService: any;

  const mockBatch = {
    id: 'batch-1',
    variantId: 'var-1',
    batchNumber: 'B1',
    availableQuantity: 100,
    reservedQuantity: 10,
    warehouseId: 'wh-1',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      productBatch: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      storageLocation: {
        findUnique: jest.fn(),
      },
      businessSettings: {
        findUnique: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findBatchById', () => {
    it('should find unique batch', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue(mockBatch);
      const res = await repository.findBatchById('batch-1');
      expect(res).toEqual(mockBatch);
      expect(prismaService.productBatch.findUnique).toHaveBeenCalledWith({ where: { id: 'batch-1' } });
    });
  });

  describe('decrementBatch', () => {
    it('should throw InsufficientStockException if updateMany returns count 0', async () => {
      prismaService.productBatch.updateMany.mockResolvedValue({ count: 0 });
      await expect(repository.decrementBatch('batch-1', 50)).rejects.toThrow(InsufficientStockException);
    });

    it('should throw BatchNotFoundException if batch is deleted after decrement', async () => {
      prismaService.productBatch.updateMany.mockResolvedValue({ count: 1 });
      prismaService.productBatch.findUnique.mockResolvedValue(null);
      await expect(repository.decrementBatch('batch-1', 50)).rejects.toThrow(BatchNotFoundException);
    });

    it('should successfully decrement available quantity', async () => {
      prismaService.productBatch.updateMany.mockResolvedValue({ count: 1 });
      const updatedBatch = { ...mockBatch, availableQuantity: 50 };
      prismaService.productBatch.findUnique.mockResolvedValue(updatedBatch);
      const res = await repository.decrementBatch('batch-1', 50);
      expect(res.availableQuantity).toBe(50);
    });
  });

  describe('reserveBatch', () => {
    it('should throw BatchNotFoundException if batch does not exist', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue(null);
      await expect(repository.reserveBatch('batch-1', 10)).rejects.toThrow(BatchNotFoundException);
    });

    it('should throw InsufficientStockException if available - reserved < requested', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        availableQuantity: 10,
        reservedQuantity: 8,
      });
      await expect(repository.reserveBatch('batch-1', 5)).rejects.toThrow(InsufficientStockException);
    });

    it('should increment reservedQuantity if stock is available', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        availableQuantity: 100,
        reservedQuantity: 10,
      });
      const updated = { ...mockBatch, reservedQuantity: 20 };
      prismaService.productBatch.update.mockResolvedValue(updated);
      const res = await repository.reserveBatch('batch-1', 10);
      expect(res.reservedQuantity).toBe(20);
    });
  });

  describe('releaseReservation', () => {
    it('should throw BatchNotFoundException if batch does not exist', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue(null);
      await expect(repository.releaseReservation('batch-1', 10)).rejects.toThrow(BatchNotFoundException);
    });

    it('should throw InvalidReservationException if releasing more than reserved', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        reservedQuantity: 5,
      });
      await expect(repository.releaseReservation('batch-1', 10)).rejects.toThrow(InvalidReservationException);
    });

    it('should decrement reservedQuantity if quantity is valid', async () => {
      prismaService.productBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        reservedQuantity: 15,
      });
      const updated = { ...mockBatch, reservedQuantity: 5 };
      prismaService.productBatch.update.mockResolvedValue(updated);
      const res = await repository.releaseReservation('batch-1', 10);
      expect(res.reservedQuantity).toBe(5);
    });
  });
});
